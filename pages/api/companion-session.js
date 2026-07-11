// pages/api/companion-session.js - 星伴聊天历史的读取/保存/清空
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveCompanionSession, getCompanionSession, clearCompanionSession } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const messages = await getCompanionSession(userId);
    return res.status(200).json({ messages });
  }

  if (req.method === "POST") {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少messages" });
    // 只保留最近40条，避免无限增长
    const trimmed = messages.slice(-40);
    await saveCompanionSession(userId, trimmed);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await clearCompanionSession(userId);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
