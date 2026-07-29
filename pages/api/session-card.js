// pages/api/session-card.js
// 会话小结卡：聊天告一段落时，许安和/余生出一张 50 字内的温暖小结卡。
// 同时给一个心情分（0-100），供"转情绪日记"预填。
import { MODELS } from "../../lib/models";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();

  const { messages, roleKind } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 2) {
    return res.status(200).json({ card: null });
  }
  if (!process.env.SILICONFLOW_API_KEY) return res.status(200).json({ card: null });

  const textOf = (c) => typeof c === "string" ? c
    : Array.isArray(c) ? c.filter(p => p?.type === "text").map(p => p.text || "").join("") : "";
  const convo = messages
    .filter(m => !(m.role === "user" && textOf(m.content).startsWith("（")))
    .slice(-16)
    .map(m => `${m.role === "user" ? "TA" : "我"}：${textOf(m.content)}`)
    .join("\n");

  const isCompanion = roleKind !== "code";
  const who = isCompanion ? "许安和" : "余生";

  const prompt = isCompanion
    ? `你是许安和，一位温柔的姐姐。下面是你和一个青少年今天的聊天。请出一张温暖的"会话小结卡"，只返回JSON：
${convo}

要求：
- summary：50字以内，温柔地回顾今天TA聊的重点 + 一句真诚的肯定或惦记。像朋友，不像总结报告。可以带1个emoji。
  例："今天你说到和妈妈冷战的事，最后说想先道歉，我觉得很勇敢💗 明天记得带杯热牛奶给她。"
- mood：0-100，根据今天聊天内容判断TA的心情分（越低越难受）
- diaryHint：一句填空开头，格式固定："今天我和许安和聊了____，我感觉____，我决定明天____"里的三个空的建议填法，用顿号分隔，如"和妈妈冷战的事、有点委屈但松了口气、主动道歉"

返回：{"summary":"...","mood":65,"diaryHint":"...、...、..."}`
    : `你是余生，一位热血的编程学长。下面是你和一个青少年今天的编程学习聊天。请出一张鼓励的"会话小结卡"，只返回JSON：
${convo}

要求：
- summary：50字以内，具体回顾TA今天做出/学到了什么 + 一句为TA骄傲的鼓励 + 下次可以做什么。带1个emoji。
  例："今天你写出了第一个ToDoList组件，改了3次bug都没放弃，太强了✅ 下次我们加删除功能！"
- mood：60-90，学习通常是积极的，根据TA是否受挫调整
- diaryHint：填空建议"今天我和余生聊了____，我感觉____，我决定明天____"，如"做ToDoList、卡bug时有点急但搞定了很爽、加删除功能"

返回：{"summary":"...","mood":75,"diaryHint":"...、...、..."}`;

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}` },
      body: JSON.stringify({
        model: MODELS.utility,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.6,
      }),
    });
    const data = await r.json();
    let raw = data?.choices?.[0]?.message?.content?.trim() || "";
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(raw);

    return res.status(200).json({
      card: {
        who,
        roleKind: isCompanion ? "companion" : "code",
        summary: (parsed.summary || "").slice(0, 120),
        mood: Math.max(0, Math.min(100, Number(parsed.mood) || 60)),
        diaryHint: (parsed.diaryHint || "").slice(0, 100),
      },
    });
  } catch {
    return res.status(200).json({ card: null });
  }
}
