// pages/api/achievement-trigger.js
// 通用成就触发接口，各个功能完成后调用
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getAchievements, unlockAchievement, countCompletedScenarios } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  const { trigger } = req.body || {};
  if (!trigger) return res.status(400).json({ error: "缺少trigger" });

  const existing = new Set((await getAchievements(userId)).map(a => a.achievement_id));
  const newlyUnlocked = [];

  async function tryUnlock(id) {
    if (!existing.has(id)) {
      await unlockAchievement(userId, id);
      newlyUnlocked.push(id);
      existing.add(id);
    }
  }

  switch (trigger) {
    case "first_chat":
      await tryUnlock("first_login");
      await tryUnlock("first_chat");
      break;
    case "first_scenario":
      await tryUnlock("first_scenario");
      const count = await countCompletedScenarios(userId);
      if (count >= 5) await tryUnlock("scenario_5");
      if (count >= 10) await tryUnlock("scenario_10");
      break;
    case "first_questionnaire":
      await tryUnlock("first_questionnaire");
      break;
    case "first_ai_course":
      await tryUnlock("first_ai_course");
      break;
    default:
      break;
  }

  return res.status(200).json({ ok: true, newlyUnlocked });
}
