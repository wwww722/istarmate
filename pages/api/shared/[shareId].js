// pages/api/shared/[shareId].js - 公开访问，无需登录
import { getSnippetByShareId } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { shareId } = req.query;
  if (!shareId) return res.status(400).json({ error: "缺少shareId" });
  const snippet = await getSnippetByShareId(shareId);
  if (!snippet) return res.status(404).json({ error: "作品不存在" });
  return res.status(200).json({ snippet });
}
