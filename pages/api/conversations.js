// pages/api/conversations.js - 多会话管理
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import {
  listConversations, createConversation, getConversation,
  updateConversation, renameConversation, deleteConversation,
} from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  // GET /api/conversations?kind=companion         -> 会话列表
  // GET /api/conversations?id=123                 -> 单个会话详情
  if (req.method === "GET") {
    const { id, kind } = req.query;
    if (id) {
      const conv = await getConversation(userId, Number(id));
      if (!conv) return res.status(404).json({ error: "会话不存在" });
      return res.status(200).json({ conversation: conv });
    }
    const list = await listConversations(userId, kind || "companion");
    return res.status(200).json({ conversations: list });
  }

  // POST -> 新建会话
  if (req.method === "POST") {
    const { kind, title, meta } = req.body || {};
    const conv = await createConversation(userId, kind || "companion", title || "新对话", meta || {});
    return res.status(200).json({ conversation: conv });
  }

  // PUT -> 更新消息 / 重命名
  if (req.method === "PUT") {
    const { id, messages, meta, title } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少id" });
    if (title !== undefined) {
      await renameConversation(userId, Number(id), title);
      return res.status(200).json({ ok: true });
    }
    if (Array.isArray(messages)) {
      await updateConversation(userId, Number(id), messages, meta ?? null);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "缺少 messages 或 title" });
  }

  // DELETE -> 删除会话
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "缺少id" });
    await deleteConversation(userId, Number(id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
