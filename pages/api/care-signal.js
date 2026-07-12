// pages/api/care-signal.js
// 综合关怀信号：连续低落 / 好久不见 / 情绪下滑趋势
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMoodLogs, getDaysAway, getMoodTrend } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  const [logs, daysAway, trend] = await Promise.all([
    getMoodLogs(userId, 7),
    getDaysAway(userId),
    getMoodTrend(userId),
  ]);

  // 1. 连续低落（最优先）
  let lowStreak = 0;
  for (const l of logs) {
    if (l.mood === "down" || l.mood === "bad") lowStreak++;
    else break;
  }

  const signals = {
    lowStreak: lowStreak >= 3 ? { days: lowStreak } : null,
    longAway: daysAway >= 3 ? { days: daysAway } : null,
    declining: trend?.trend === "declining" ? trend : null,
    improving: trend?.trend === "improving" ? trend : null,
  };

  return res.status(200).json({ signals });
}
