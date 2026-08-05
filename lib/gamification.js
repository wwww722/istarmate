// lib/gamification.js
// 游戏化后端逻辑：XP / 星光币 / 连胜 / 每日任务 / 段位
import { sqlQuery as sql } from "./db";

export const LEAGUE_RULES = [
  { code: "bronze_star",   name: "青铜星",   min: 0,      icon: "🥉" },
  { code: "silver_moon",   name: "白银月",   min: 500,    icon: "🥈" },
  { code: "golden_sun",    name: "黄金日",   min: 2000,   icon: "🥇" },
  { code: "diamond_galaxy",name: "钻石银河", min: 8000,   icon: "💎" },
];
export function leagueOf(xp) {
  let r = LEAGUE_RULES[0];
  for (const l of LEAGUE_RULES) if (xp >= l.min) r = l;
  return r;
}

export async function ensureGamificationRow(userId) {
  userId = Number(userId);
  const exist = (await sql("SELECT user_id FROM user_gamification WHERE user_id = $1", [userId])).rows[0];
  if (exist) return;
  await sql("INSERT INTO user_gamification (user_id, xp, stardust, streak, current_energy) VALUES ($1,0,0,0,20) ON CONFLICT DO NOTHING", [userId]);
  await sql("INSERT INTO user_subscriptions (user_id, tier) VALUES ($1,'free') ON CONFLICT DO NOTHING", [userId]);
}

export async function addXp(userId, delta, reason, detail) {
  userId = Number(userId);
  if (!delta) return { xp: 0 };
  await ensureGamificationRow(userId);
  await sql("UPDATE user_gamification SET xp = xp + $2, updated_at = NOW() WHERE user_id = $1", [userId, delta]);
  if (delta > 0) {
    await sql("INSERT INTO xp_logs (user_id, delta, reason, detail) VALUES ($1,$2,$3,$4)", [userId, delta, reason, detail || null]);
  }
  const xp = (await sql("SELECT xp FROM user_gamification WHERE user_id = $1", [userId])).rows[0].xp;
  const nl = leagueOf(xp);
  await sql("UPDATE user_gamification SET current_league = $2 WHERE user_id = $1", [userId, nl.code]);
  return { xp, league: nl };
}

export async function addStardust(userId, delta, reason) {
  userId = Number(userId);
  await ensureGamificationRow(userId);
  if (delta < 0) {
    const cur = (await sql("SELECT stardust FROM user_gamification WHERE user_id = $1", [userId])).rows[0].stardust;
    if (cur + delta < 0) return { ok: false, reason: "星光币不够" };
  }
  await sql("UPDATE user_gamification SET stardust = stardust + $2, updated_at = NOW() WHERE user_id = $1", [userId, delta]);
  const sd = (await sql("SELECT stardust FROM user_gamification WHERE user_id = $1", [userId])).rows[0].stardust;
  return { ok: true, stardust: sd };
}

export const TASK_DEFS = [
  { code: "chat5",     title: "和星野 / 川 聊 5 句",   target: 5, xp: 20, stardust: 5,  icon: "💬" },
  { code: "breathing", title: "完成一次呼吸练习",       target: 1, xp: 15, stardust: 5,  icon: "🌬️" },
  { code: "runcode",   title: "在编辑器里运行一次代码", target: 1, xp: 20, stardust: 10, icon: "▶️" },
  { code: "checkin",   title: "今日心情打卡",           target: 1, xp: 10, stardust: 3,  icon: "📝" },
];

export async function progressTask(userId, taskCode, inc = 1) {
  userId = Number(userId);
  await ensureGamificationRow(userId);
  const task = TASK_DEFS.find(t => t.code === taskCode);
  if (!task) return { ok: false };
  const today = new Date();
  const row = (await sql("SELECT id,progress,completed,claimed FROM daily_task_completions WHERE user_id=$1 AND task_code=$2::text AND log_date=$3", [userId, taskCode, today])).rows[0];
  let id = row?.id, progress = row?.progress || 0, completed = !!row?.completed, claimed = !!row?.claimed;
  progress = Math.min(task.target, progress + inc);
  completed = progress >= task.target;
  if (!id) {
    id = (await sql("INSERT INTO daily_task_completions (user_id, task_id, task_code, progress, completed, log_date) VALUES ($1,(SELECT id FROM daily_tasks WHERE task_code=$2::text),$2::text,$3,$4,$5) RETURNING id", [userId, taskCode, progress, completed, today])).rows[0].id;
  } else {
    await sql("UPDATE daily_task_completions SET progress=$3, completed=$4 WHERE id=$1 AND NOT claimed", [id, null, progress, completed]);
  }
  let justAwarded = null;
  if (completed && !claimed) {
    await sql("UPDATE daily_task_completions SET claimed=TRUE WHERE id=$1", [id]);
    await addXp(userId, task.xp, `task_${taskCode}`, task.title);
    const sd = await addStardust(userId, task.stardust, `task_${taskCode}`);
    justAwarded = { taskCode, xp: task.xp, stardust: task.stardust, stardustBalance: sd.stardust };
  }
  return { ok: true, taskCode, progress, target: task.target, completed, claimed, justAwarded };
}

export async function doDailyCheckin(userId, mood) {
  userId = Number(userId);
  await ensureGamificationRow(userId);
  const todayStr = new Date().toISOString().slice(0,10);
  const row = (await sql("SELECT streak, last_checkin_date FROM user_gamification WHERE user_id=$1", [userId])).rows[0];
  let streak = row?.streak || 0;
  const last = row?.last_checkin_date;
  const isNew = !last || String(last).slice(0,10) !== todayStr;
  if (isNew) {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    streak = (last && String(last).slice(0,10) === y) ? streak + 1 : 1;
    const bonusXp = streak >= 7 ? 30 : streak >= 3 ? 15 : 0;
    if (bonusXp) await addXp(userId, bonusXp, `streak_bonus_${streak}`, `连胜 ${streak} 天奖励`);
    await sql("UPDATE user_gamification SET streak=$2, last_checkin_date=$3, updated_at=NOW() WHERE user_id=$1", [userId, streak, todayStr]);
  }
  await progressTask(userId, "checkin", 1);
  return { streak, isNew };
}

export async function getGamificationSnapshot(userId) {
  userId = Number(userId);
  await ensureGamificationRow(userId);
  let g = (await sql("SELECT * FROM user_gamification WHERE user_id=$1", [userId])).rows[0];
  // 防御：万一行不存在，用默认值兜底，绝不让 g.xp 崩
  if (!g) g = { xp: 0, stardust: 0, streak: 0, last_checkin_date: null, current_energy: 20 };
  const sub = (await sql("SELECT * FROM user_subscriptions WHERE user_id=$1", [userId])).rows[0];
  const today = new Date();
  const rows = (await sql("SELECT task_code,progress,completed,claimed FROM daily_task_completions WHERE user_id=$1 AND log_date=$2", [userId, today])).rows;
  const tasks = TASK_DEFS.map(t => {
    const r = rows.find(x => x.task_code === t.code);
    return { ...t, progress: r?.progress || 0, completed: !!r?.completed, claimed: !!r?.claimed };
  });
  const league = leagueOf(g.xp);
  const nextIdx = Math.min(LEAGUE_RULES.findIndex(l => l.code === league.code) + 1, LEAGUE_RULES.length - 1);
  return {
    xp: g.xp, stardust: g.stardust, streak: g.streak, last_checkin_date: g.last_checkin_date,
    energy: g.current_energy, league, nextLeague: LEAGUE_RULES[nextIdx],
    tier: sub?.tier || "free", trial_ends_at: sub?.trial_ends_at || null, family_inviter_id: sub?.family_inviter_id || null,
    tasks,
  };
}

export async function consumeEnergy(userId, cost = 1) {
  userId = Number(userId);
  const sub = (await sql("SELECT tier FROM user_subscriptions WHERE user_id=$1", [userId])).rows[0];
  if (["growth","premium"].includes(sub?.tier)) return { ok: true, free: true };
  await ensureGamificationRow(userId);
  const todayStr = new Date().toISOString().slice(0,10);
  const g = (await sql("SELECT current_energy, last_energy_refill FROM user_gamification WHERE user_id=$1", [userId])).rows[0];
  let energy = g.current_energy;
  const last = String(g.last_energy_refill || "").slice(0,10);
  if (last !== todayStr) { energy = 20; await sql("UPDATE user_gamification SET current_energy=20, last_energy_refill=$2 WHERE user_id=$1", [userId, todayStr]); }
  if (energy < cost) return { ok: false, reason: "今日陪伴值用完啦，明天再来，或者升级成长版解锁无限 ✨" };
  await sql("UPDATE user_gamification SET current_energy=current_energy-$2 WHERE user_id=$1", [userId, cost]);
  return { ok: true, remaining: energy - cost };
}
