// pages/api/feedback.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveFeedback } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const { context, rating } = req.body || {};
  if (!context || !rating) return res.status(400).json({ error: "缺少参数" });
  await saveFeedback(Number(session.userId), context, rating);
  return res.status(200).json({ ok: true });
}
