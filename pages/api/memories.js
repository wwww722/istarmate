// pages/api/memories.js - 用户查看/删除星伴记住的关于自己的事
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getAllMemories, deleteMemory } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const memories = await getAllMemories(userId);
    return res.status(200).json({ memories });
  }

  if (req.method === "DELETE") {
    const { category, key } = req.query;
    if (!category || !key) return res.status(400).json({ error: "缺少参数" });
    await deleteMemory(userId, category, key);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
