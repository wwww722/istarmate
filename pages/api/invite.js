// pages/api/invite.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getOrCreateInviteCode, useInviteCode, getInviteStats, unlockAchievement, getAchievements } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const code = await getOrCreateInviteCode(userId);
    const count = await getInviteStats(userId);
    return res.status(200).json({ code, inviteCount: count });
  }

  // POST: 新用户使用邀请码
  if (req.method === "POST") {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "缺少邀请码" });
    const ownerId = await useInviteCode(code.trim().toUpperCase(), userId);
    if (!ownerId) return res.status(400).json({ error: "邀请码无效或已使用" });

    const newlyUnlocked = [];
    // 给被邀请人解锁成就
    const existing = new Set((await getAchievements(userId)).map(a => a.achievement_id));
    if (!existing.has("invited_friend")) {
      await unlockAchievement(userId, "invited_friend");
      newlyUnlocked.push("invited_friend");
    }
    // 给邀请人解锁成就
    const ownerExisting = new Set((await getAchievements(ownerId)).map(a => a.achievement_id));
    if (!ownerExisting.has("invite_friend")) {
      await unlockAchievement(ownerId, "invite_friend");
    }
    return res.status(200).json({ ok: true, newlyUnlocked });
  }

  return res.status(405).end();
}
