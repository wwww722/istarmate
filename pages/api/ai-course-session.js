// pages/api/ai-course-session.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getAiCourseSession, saveAiCourseSession, unlockAchievement, getAchievements } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const s = await getAiCourseSession(userId);
    return res.status(200).json({ messages: s?.messages || [] });
  }

  if (req.method === "POST") {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });
    await saveAiCourseSession(userId, messages);

    // 首次进入AI课程成就
    const existing = (await getAchievements(userId)).map(a => a.achievement_id);
    const newlyUnlocked = [];
    if (!existing.includes("first_ai_course") && messages.length > 1) {
      await unlockAchievement(userId, "first_ai_course");
      newlyUnlocked.push("first_ai_course");
    }
    return res.status(200).json({ ok: true, newlyUnlocked });
  }

  if (req.method === "DELETE") {
    await saveAiCourseSession(userId, []);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
