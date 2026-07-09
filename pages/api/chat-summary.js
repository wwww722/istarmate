// pages/api/chat-summary.js
// 对话结束后，让AI生成摘要存起来，下次聊天时注入给星伴作为"记忆"
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveChatSummary, getRecentChatSummaries } from "../../lib/db";

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
      return res.status(200).json({ ok: true }); // 对话太短，不值得总结
    }

    if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置API Key" });

    // 只取用户说的话来总结
    const userMessages = messages.filter(m => m.role === "user").map(m => m.content).join("\n");

    const prompt = `以下是一个青少年和心理陪伴AI"星伴"的对话中，用户说的话：

${userMessages}

请用1-2句话总结用户在这次对话中表达的主要情绪或事件，用于下次聊天时的参考背景。
格式：直接说内容，不要加"用户"二字，用第三人称。例如："提到最近因为考试压力大睡不好，对未来感到迷茫。"`;

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
          max_tokens: 100,
          temperature: 0.3,
        }),
      });
      const data = await r.json();
      const summary = data?.choices?.[0]?.message?.content?.trim();
      if (summary) await saveChatSummary(userId, summary);
    } catch { /* 摘要生成失败不影响主流程 */ }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
