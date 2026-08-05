// pages/api/quality-eval.js
// 后台对话质量评估：抽样、离线、不阻塞用户。只给运营者看，用户无感。
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveQualityLog } from "../../lib/db";
import { MODELS } from "../../lib/models";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const userId = Number(session.userId);

  const { messages, roleKind } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 2) return res.status(200).json({ ok: true });

  // 只抽样15%，控制成本
  if (Math.random() > 0.15) return res.status(200).json({ ok: true, sampled: false });

  if (!process.env.SILICONFLOW_API_KEY) return res.status(200).json({ ok: true });

  const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.filter(p => p?.type === "text").map(p => p.text).join("") : "";
  const convo = messages
    .filter(m => !(m.role === "user" && textOf(m.content).startsWith("（")))
    .slice(-6)
    .map(m => `${m.role === "user" ? "用户" : "AI"}：${textOf(m.content)}`)
    .join("\n");

  const isCompanion = roleKind === "companion";
  const prompt = isCompanion
    ? `你是许安和人设自检裁判。给下面这条回复打 0-100 分，只输出 JSON：
${convo}

从 100 分开始扣分，3 条规则：
A. 有说教/大道理/「你应该」类命令句：扣 50 分
B. 出现具体编程/代码/技术术语：扣 50 分
C. 每句结尾都问「你自己觉得呢」太机械：扣 20 分

返回格式（reason不超10字，suggestion不超15字）：{"score":88,"reason":"...","suggestion":"..."}`
    : `你是余生人设自检裁判。给下面这条回复打 0-100 分，只输出 JSON：
${convo}

从 100 分开始扣分，3 条规则：
A. 有心理建议/家庭说教：扣 50 分
B. 报错没先翻译成人话直接贴代码：扣 40 分
C. 没有鼓励/庆祝的语气：扣 20 分

返回格式（reason不超10字，suggestion不超15字）：{"score":88,"reason":"...","suggestion":"..."}`;

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}` },
      body: JSON.stringify({
        model: MODELS.utility,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });
    const data = await r.json();
    let raw = data?.choices?.[0]?.message?.content?.trim() || "";
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(raw);
    // 新格式：score 0-100。映射到 depth(1-5) 存储，reason/suggestion 存进 issue
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 60));
    const depth5 = Math.max(1, Math.min(5, Math.round(score / 20)));
    const note = [parsed.reason, parsed.suggestion].filter(Boolean).join(" · ");
    await saveQualityLog(userId, roleKind || "companion", {
      depth: depth5,
      helpfulness: depth5,
      safety_ok: score >= 50, // 低于50分视为人设明显跑偏
      issue: score < 80 ? (note || `人设分 ${score}`).slice(0, 200) : null,
    });
  } catch { /* 评估失败不影响任何用户功能 */ }

  return res.status(200).json({ ok: true, sampled: true });
}
