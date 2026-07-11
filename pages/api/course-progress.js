// pages/api/course-progress.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getCourseProgress, completeCourseStage } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const progress = await getCourseProgress(userId);
    return res.status(200).json({ progress });
  }

  if (req.method === "POST") {
    const { stage } = req.body || {};
    if (!stage) return res.status(400).json({ error: "缺少stage" });
    const progress = await completeCourseStage(userId, Number(stage));
    return res.status(200).json({ ok: true, progress });
  }

  return res.status(405).end();
}
