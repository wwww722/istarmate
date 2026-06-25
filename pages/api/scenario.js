// pages/api/scenario.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getLatestQuestionnaire, getScenarioLog, getScenarioHistory, upsertScenarioProgress } from "../../lib/db";
import { pickTodayScenario, todayDateStr } from "../../lib/scenarios";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);
  const dateStr = todayDateStr();

  if (req.method === "GET") {
    const q = await getLatestQuestionnaire(userId);
    if (!q) return res.status(400).json({ error: "请先完成问卷" });
    const questionnaire = { domains: q.domains, crisisTriggered: q.crisis_triggered };
    const scenario = pickTodayScenario(questionnaire, dateStr);
    const log = await getScenarioLog(userId, dateStr);
    const history = await getScenarioHistory(userId, 365);
    const completedDays = history.filter((h) => h.completed).length;
    return res.status(200).json({
      scenario,
      dayCount: completedDays + 1,
      progress: log
        ? { stepIndex: log.step_index, choices: log.choices, completed: log.completed }
        : { stepIndex: 0, choices: [], completed: false },
    });
  }

  if (req.method === "POST") {
    const { scenarioId, stepIndex, choices, completed } = req.body || {};
    if (!scenarioId) return res.status(400).json({ error: "缺少 scenarioId" });
    await upsertScenarioProgress(userId, dateStr, scenarioId, stepIndex, choices, !!completed);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
