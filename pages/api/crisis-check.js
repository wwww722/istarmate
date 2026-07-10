// pages/api/crisis-check.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveCrisisLog } from "../../lib/db";

const CRISIS_KEYWORDS = {
  high: ["不想活了", "想死", "去死", "自杀", "割腕", "跳楼", "结束生命", "活不下去", "不如死了"],
  medium: ["伤害自己", "自残", "划自己", "不想存在", "消失掉", "活着没意思", "没有意义活着"],
};

export function detectCrisis(text) {
  if (!text) return null;
  for (const kw of CRISIS_KEYWORDS.high) {
    if (text.includes(kw)) return { level: "high", keyword: kw };
  }
  for (const kw of CRISIS_KEYWORDS.medium) {
    if (text.includes(kw)) return { level: "medium", keyword: kw };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const { message } = req.body || {};
  if (!message) return res.status(200).json({ crisis: null });
  const result = detectCrisis(message);
  if (result) {
    try {
      await saveCrisisLog(Number(session.userId), message, result.keyword);
    } catch {}
  }
  return res.status(200).json({ crisis: result });
}
