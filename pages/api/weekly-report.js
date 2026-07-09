// pages/api/weekly-report.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMoodLogs, getWeeklyReports, saveWeeklyReport, getScenarioHistory } from "../../lib/db";

const MOOD_VALUES = { great: 4, ok: 3, meh: 2, down: 1, bad: 0 };
const MOOD_LABEL_ZH = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const userId = Number(session.userId);

  if (req.method === "GET") {
    // 先尝试生成/更新本周报告
    await generateCurrentWeekReport(userId);
    const reports = await getWeeklyReports(userId, 8);
    return res.status(200).json({ reports });
  }

  return res.status(405).end();
}

async function generateCurrentWeekReport(userId) {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // 获取本周心情打卡
  const allLogs = await getMoodLogs(userId, 60);
  const weekLogs = allLogs.filter(l => {
    const d = typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0, 10);
    return d >= weekStart && d <= weekEndStr;
  });

  if (weekLogs.length === 0) return; // 本周没有数据

  // 计算统计
  const moodValues = weekLogs.map(l => ({ date: l.log_date, mood: l.mood, value: MOOD_VALUES[l.mood] ?? 2 }));
  const bestDay = moodValues.reduce((a, b) => a.value > b.value ? a : b);
  const worstDay = moodValues.reduce((a, b) => a.value < b.value ? a : b);
  const avgValue = moodValues.reduce((sum, m) => sum + m.value, 0) / moodValues.length;

  const history = await getScenarioHistory(userId, 7);
  const scenariosThisWeek = history.filter(h => {
    const d = typeof h.scenario_date === "string" ? h.scenario_date : new Date(h.scenario_date).toISOString().slice(0, 10);
    return d >= weekStart && d <= weekEndStr && h.completed;
  }).length;

  const moodCounts = {};
  weekLogs.forEach(l => { moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1; });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "meh";

  const report = {
    weekStart,
    checkIns: weekLogs.length,
    scenarios: scenariosThisWeek,
    bestDay: { date: typeof bestDay.date === "string" ? bestDay.date : new Date(bestDay.date).toISOString().slice(0, 10), mood: bestDay.mood, label: MOOD_LABEL_ZH[bestDay.mood] },
    worstDay: { date: typeof worstDay.date === "string" ? worstDay.date : new Date(worstDay.date).toISOString().slice(0, 10), mood: worstDay.mood, label: MOOD_LABEL_ZH[worstDay.mood] },
    avgScore: Math.round(avgValue * 10) / 10,
    dominantMood,
    dominantMoodLabel: MOOD_LABEL_ZH[dominantMood],
    moodCounts,
    logs: weekLogs.map(l => ({
      date: typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0, 10),
      mood: l.mood
    })),
  };

  await saveWeeklyReport(userId, weekStart, report);
}
