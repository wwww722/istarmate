// pages/api/chat-summary.js
// 对话结束后，AI同时生成：(1)情绪摘要 (2)结构化记忆（记住具体的人和事）
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveChatSummary, getRecentChatSummaries, upsertMemory } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const summaries = await getRecentChatSummaries(userId, 5);
    return res.status(200).json({ summaries });
  }

  if (req.method === "POST") {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length < 2) {
      return res.status(200).json({ ok: true });
    }
    if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置API Key" });

    const textOf = (c) => {
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter(p => p?.type === "text").map(p => p.text || "").join("");
      return "";
    };
    const convo = messages
      .filter(m => !(m.role === "user" && textOf(m.content).startsWith("（")))
      .map(m => `${m.role === "user" ? "用户" : "星伴"}：${textOf(m.content)}`)
      .join("\n");

    const prompt = `以下是一个青少年和心理陪伴AI"星伴"的对话：

${convo}

请完成两个任务，用JSON格式返回（不要任何其他文字）：

1. summary：用1-2句话总结用户这次表达的主要情绪或事件（第三人称，不加"用户"二字）

2. memories：从对话中提取值得长期记住的"具体的人和事"，帮助星伴以后像老朋友一样记得TA。每条包含：
   - category: "person"(具体的人，如老师同学家人) / "event"(具体事件，如某次考试比赛) / "concern"(反复出现的困扰) / "preference"(喜好) / "goal"(目标愿望)
   - key: 简短标识（4-10字，如"数学王老师""期中考试""和妈妈的关系"）
   - detail: 具体内容（一句话）
   - importance: 1-3（3=对TA很重要的人或事）
   只提取明确提到的、具体的信息。没有就返回空数组。不要编造。

返回格式示例：
{"summary":"提到期中考试压力大，和好朋友闹了矛盾感到孤单。","memories":[{"category":"event","key":"期中考试","detail":"下周期中考试，很焦虑怕考不好","importance":2},{"category":"person","key":"好朋友小雨","detail":"最好的朋友，最近因为误会闹矛盾","importance":3}]}`;

    try {
      const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        },
        body: JSON.stringify({
          model: "Pro/zai-org/GLM-5.1",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });
      const data = await r.json();
      let raw = data?.choices?.[0]?.message?.content?.trim() || "";
      // 去掉可能的markdown代码块包裹
      raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

      let parsed = null;
      try { parsed = JSON.parse(raw); } catch {}

      if (parsed?.summary) {
        await saveChatSummary(userId, parsed.summary);
      }
      if (Array.isArray(parsed?.memories)) {
        for (const m of parsed.memories.slice(0, 6)) {
          if (m?.category && m?.key && m?.detail) {
            const imp = Math.max(1, Math.min(3, Number(m.importance) || 1));
            await upsertMemory(userId, String(m.category), String(m.key).slice(0, 30), String(m.detail).slice(0, 200), imp).catch(() => {});
          }
        }
      }
    } catch { /* 失败不影响主流程 */ }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
