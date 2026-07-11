// pages/api/mood-diary.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMoodDiary } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const entries = await getMoodDiary(Number(session.userId), 30);
  return res.status(200).json({ entries });
}
