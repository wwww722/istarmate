// pages/api/conversations.js - 多会话管理：列表/详情/新建/更新/重命名/删除/置顶/归档/搜索
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import {
  listConversations, createConversation, getConversation,
  updateConversation, renameConversation, deleteConversation,
  togglePinConversation, archiveConversation, listArchivedConversations,
  searchConversations,
} from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const { id, kind, q, archived } = req.query;
    if (id) {
      const conv = await getConversation(userId, Number(id));
      if (!conv) return res.status(404).json({ error: "会话不存在" });
      return res.status(200).json({ conversation: conv });
    }
    if (q) {
      const results = await searchConversations(userId, String(q), kind || "companion");
      return res.status(200).json({ results });
    }
    if (archived === "true") {
      const list = await listArchivedConversations(userId, kind || "companion");
      return res.status(200).json({ conversations: list });
    }
    const list = await listConversations(userId, kind || "companion");
    return res.status(200).json({ conversations: list });
  }

  if (req.method === "POST") {
    const { kind, title, meta } = req.body || {};
    const conv = await createConversation(userId, kind || "companion", title || "新对话", meta || {});
    return res.status(200).json({ conversation: conv });
  }

  if (req.method === "PUT") {
    const { id, messages, meta, title, pinned, archived } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少id" });

    if (pinned !== undefined) {
      await togglePinConversation(userId, Number(id), !!pinned);
      return res.status(200).json({ ok: true });
    }
    if (archived !== undefined) {
      await archiveConversation(userId, Number(id), !!archived);
      return res.status(200).json({ ok: true });
    }
    if (title !== undefined) {
      await renameConversation(userId, Number(id), title);
      return res.status(200).json({ ok: true });
    }
    if (Array.isArray(messages)) {
      await updateConversation(userId, Number(id), messages, meta ?? null);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "缺少有效字段" });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "缺少id" });
    await deleteConversation(userId, Number(id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
