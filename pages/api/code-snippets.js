// pages/api/code-snippets.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveCodeSnippet, getCodeSnippets, getCodeSnippet, deleteCodeSnippet, getPublicSnippets, toggleSnippetPublic, unlockAchievement, getAchievements } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    if (req.query.id) {
      const snippet = await getCodeSnippet(userId, Number(req.query.id));
      return res.status(200).json({ snippet });
    }
    const snippets = await getCodeSnippets(userId);
    return res.status(200).json({ snippets });
  }

  if (req.method === "POST") {
    const { title, code, language } = req.body || {};
    if (!title || !code) return res.status(400).json({ error: "缺少标题或代码" });
    const snippet = await saveCodeSnippet(userId, title, code, language || "html");
    return res.status(200).json({ ok: true, snippet });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "缺少id" });
    await deleteCodeSnippet(userId, Number(id));
    return res.status(200).json({ ok: true });
  }

  // PATCH: 切换公开/私密状态
  if (req.method === "PATCH") {
    const { id, isPublic, description } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少id" });
    await toggleSnippetPublic(userId, Number(id), !!isPublic, description || '');
    const newlyUnlocked = [];
    if (isPublic) {
      const existing = new Set((await getAchievements(userId)).map(a => a.achievement_id));
      if (!existing.has("showcase")) {
        await unlockAchievement(userId, "showcase");
        newlyUnlocked.push("showcase");
      }
    }
    return res.status(200).json({ ok: true, newlyUnlocked });
  }

  return res.status(405).end();
}
