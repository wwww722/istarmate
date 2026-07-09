// pages/api/questionnaire.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveQuestionnaire, getLatestQuestionnaire } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const questionnaire = await getLatestQuestionnaire(userId);
    return res.status(200).json({ questionnaire });
  }

  if (req.method === "POST") {
    const { domains, crisisTriggered } = req.body || {};
    if (!domains) return res.status(400).json({ error: "缺少问卷结果" });
    const saved = await saveQuestionnaire(userId, { domains, crisisTriggered: !!crisisTriggered });
    return res.status(200).json({ ok: true, saved });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
