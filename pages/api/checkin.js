// pages/api/checkin.js
// 心情打卡 + 成就检查（每次打卡后自动检查是否解锁新成就）
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import {
  saveMoodLog, getMoodLogs, getAchievements, unlockAchievement,
  checkStreak, countCompletedScenarios
} from "../../lib/db";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const logs = await getMoodLogs(userId, 14);
    const achievements = await getAchievements(userId);
    return res.status(200).json({ logs, achievements: achievements.map(a => a.achievement_id) });
  }

  if (req.method === "POST") {
    const { mood, note } = req.body || {};
    if (!mood) return res.status(400).json({ error: "缺少 mood" });

    await saveMoodLog(userId, todayStr(), mood, note || "");

    // 检查成就
    const existing = (await getAchievements(userId)).map(a => a.achievement_id);
    const newlyUnlocked = [];

    async function tryUnlock(id) {
      if (!existing.includes(id)) {
        await unlockAchievement(userId, id);
        newlyUnlocked.push(id);
      }
    }

    // 连续打卡成就
    const streak = await checkStreak(userId);
    if (streak >= 3) await tryUnlock("streak_3");
    if (streak >= 7) await tryUnlock("streak_7");
    if (streak >= 14) await tryUnlock("streak_14");

    // 情绪全家桶：记录过所有5种
    const logs = await getMoodLogs(userId, 100);
    const moodSet = new Set(logs.map(l => l.mood));
    const allMoods = ["great", "ok", "meh", "down", "bad"];
    if (allMoods.every(m => moodSet.has(m))) await tryUnlock("mood_all");

    // 首次打卡触发 first_login 成就
    await tryUnlock("first_login");

    return res.status(200).json({ ok: true, streak, newlyUnlocked });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
