// pages/api/growth.js - 成长可见化：本月情绪 + 重要时刻
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMonthlyGrowth, getMeaningfulMoments, getMilestones } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  const [growth, moments, milestones] = await Promise.all([
    getMonthlyGrowth(userId),
    getMeaningfulMoments(userId),
    getMilestones(userId),
  ]);

  return res.status(200).json({ growth, moments, milestones });
}
