import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getGamificationSnapshot, doDailyCheckin, progressTask, addStardust, addXp, consumeEnergy } from "../../../lib/gamification";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const uid = Number(session.userId);
  try {
    if (req.method === "GET") {
      const snap = await getGamificationSnapshot(uid);
      return res.json({ ok: true, snap });
    }
    if (req.method === "POST") {
      const { action, payload = {} } = req.body || {};
      if (action === "checkin") {
        const r = await doDailyCheckin(uid, payload.mood);
        return res.json({ ok: true, ...r, snap: await getGamificationSnapshot(uid) });
      }
      if (action === "progress") {
        const r = await progressTask(uid, payload.taskCode, payload.inc || 1);
        return res.json({ ok: true, ...r, snap: await getGamificationSnapshot(uid) });
      }
      if (action === "consume_energy") {
        const r = await consumeEnergy(uid, payload.cost || 1);
        return res.json({ ok: r.ok, reason: r.reason, remaining: r.remaining, free: r.free });
      }
      if (action === "award_xp") {
        const r = await addXp(uid, payload.delta || 0, payload.reason || "manual", payload.detail);
        return res.json({ ok: true, ...r });
      }
      if (action === "award_stardust") {
        const r = await addStardust(uid, payload.delta || 0, payload.reason || "manual");
        return res.json({ ok: r.ok, stardust: r.stardust, reason: r.reason });
      }
      return res.status(400).json({ error: "未知 action" });
    }
    res.status(405).json({ error: "方法不支持" });
  } catch (e) {
    console.error("gamification/sync error:", e);
    res.status(500).json({ error: e.message || String(e) });
  }
}
