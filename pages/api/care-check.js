// pages/api/care-check.js
// 检测最近连续低落，返回星伴主动关怀的信号
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getRecentMoodsForCare } from "../../lib/db";

const LOW_MOODS = new Set(["down", "bad"]);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const userId = Number(session.userId);

  const moods = await getRecentMoodsForCare(userId); // 已按日期倒序，最多5条

  // 从最近开始数，连续几天低落
  let consecutiveLow = 0;
  for (const m of moods) {
    if (LOW_MOODS.has(m.mood)) consecutiveLow += 1;
    else break;
  }

  let care = null;
  if (consecutiveLow >= 3) {
    care = { level: "high", days: consecutiveLow };
  } else if (consecutiveLow >= 2) {
    care = { level: "medium", days: consecutiveLow };
  }

  return res.status(200).json({ care });
}
