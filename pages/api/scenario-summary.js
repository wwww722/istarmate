// pages/api/scenario-summary.js
// 小剧场完成后生成"今日收获"总结，走后端避免前端无法访问API Key的问题
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置API Key" });

  const { messages, scenarioTitle } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 2) {
    return res.status(200).json({ summary: "今天能来这里聊聊，本身就是很好的一步。" });
  }

  const userMsgs = messages
    .filter(m => m.role === "user" && !m.content.startsWith("（"))
    .map(m => m.content)
    .join("\n");

  if (!userMsgs.trim()) {
    return res.status(200).json({ summary: "今天能来这里聊聊，本身就是很好的一步。" });
  }

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: "Pro/zai-org/GLM-5.1",
        messages: [{
          role: "user",
          content: `用户刚完成了今天的小剧场"${scenarioTitle || "心情小剧场"}"，他们说了这些话：\n${userMsgs}\n\n请用1-2句温暖的话总结TA今天表达的情绪或小小的收获，像一个懂你的朋友在说话，不要以"你"开头，不要说教，要有温度。`,
        }],
        max_tokens: 80,
        temperature: 0.6,
      }),
    });
    const data = await r.json();
    const summary = data?.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ summary: summary || "今天能来这里聊聊，本身就是很好的一步。" });
  } catch {
    return res.status(200).json({ summary: "今天能来这里聊聊，本身就是很好的一步。" });
  }
}
