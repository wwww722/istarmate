// pages/api/gallery.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { publishSnippet, getPublicSnippets, getFullPublicSnippet, getProfile } from "../../lib/db";

export default async function handler(req, res) {
  // GET：获取公开作品列表（不需要登录）
  if (req.method === "GET") {
    if (req.query.id) {
      const snippet = await getFullPublicSnippet(Number(req.query.id));
      if (!snippet) return res.status(404).json({ error: "作品不存在或未公开" });
      return res.status(200).json({ snippet });
    }
    const snippets = await getPublicSnippets(30);
    return res.status(200).json({ snippets });
  }

  // POST：发布作品到展示墙（需要登录）
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: "请先登录" });
    const userId = Number(session.userId);

    const { snippetId } = req.body || {};
    if (!snippetId) return res.status(400).json({ error: "缺少作品ID" });

    // 获取用户的动物代号作为匿名展示名
    const profile = await getProfile(userId);
    const authorDisplay = profile?.avatar_name && profile?.avatar_code
      ? `${profile.avatar_emoji || ""}${profile.avatar_name} #${profile.avatar_code}`
      : "匿名作者";

    await publishSnippet(userId, Number(snippetId), authorDisplay);
    return res.status(200).json({ ok: true, authorDisplay });
  }

  return res.status(405).end();
}
