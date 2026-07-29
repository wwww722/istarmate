// pages/api/mood-diary.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMoodDiary, saveMoodLog } from "../../lib/db";

// 心情分(0-100) → 5档mood
function scoreToMood(score) {
  const s = Number(score);
  if (s >= 80) return "great";
  if (s >= 60) return "ok";
  if (s >= 40) return "meh";
  if (s >= 20) return "down";
  return "bad";
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const entries = await getMoodDiary(userId, 30);
    return res.status(200).json({ entries });
  }

  if (req.method === "POST") {
    const { note, mood, moodScore } = req.body || {};
    if (!note || !String(note).trim()) return res.status(400).json({ error: "写点什么吧" });
    const finalMood = mood || scoreToMood(moodScore);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await saveMoodLog(userId, dateStr, finalMood, String(note).slice(0, 2000));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
