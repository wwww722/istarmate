// pages/api/showcase.js - 公开展示墙，无需登录可访问
import { getPublicSnippets } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const snippets = await getPublicSnippets(30);
  return res.status(200).json({ snippets });
}
