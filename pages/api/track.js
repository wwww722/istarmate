// pages/api/track.js
// 轻量埋点：记录圆桌相关事件到 usage_events（复用现有表）。
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { logUsage } from "../../lib/db";

const ALLOWED = new Set([
  "host_asked_invite", "invite_accepted", "invite_declined",
  "roundtable_exited", "invite_quota_hit",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(200).json({ ok: false }); // 静默失败，不影响体验
  const { event, detail } = req.body || {};
  if (!ALLOWED.has(event)) return res.status(200).json({ ok: false });

  try {
    // feature 字段存 "roundtable:事件名"，detail 附在后面（截断）
    const tag = `roundtable:${event}` + (detail ? `:${JSON.stringify(detail).slice(0, 100)}` : "");
    await logUsage(Number(session.userId), tag.slice(0, 200));
  } catch {}
  return res.status(200).json({ ok: true });
}
