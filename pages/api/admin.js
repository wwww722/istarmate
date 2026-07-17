// pages/api/admin.js - 管理后台数据，只有is_admin=true的用户能访问
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { isAdmin, getAdminStats, getRecentCrisisLogs, getSignupTrend, getSafetyLogs, getUsageStats, getRetentionCurve, getQualityStats } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });

  const userId = Number(session.userId);
  const admin = await isAdmin(userId);
  if (!admin) return res.status(403).json({ error: "无权访问" });

  const [stats, crisisLogs, signupTrend, safetyLogs, usage, retention, quality] = await Promise.all([
    getAdminStats(),
    getRecentCrisisLogs(50),
    getSignupTrend(),
    getSafetyLogs(30),
    getUsageStats(30),
    getRetentionCurve(),
    getQualityStats(30),
  ]);

  return res.status(200).json({ stats, crisisLogs, signupTrend, safetyLogs, usage, retention, quality });
}
