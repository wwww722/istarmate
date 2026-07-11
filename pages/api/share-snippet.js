// pages/api/share-snippet.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getOrCreateShareId } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const { snippetId } = req.body || {};
  if (!snippetId) return res.status(400).json({ error: "缺少snippetId" });
  const shareId = await getOrCreateShareId(Number(session.userId), Number(snippetId));
  return res.status(200).json({ shareId });
}
