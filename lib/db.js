// lib/db.js
// 云端版：用 @vercel/postgres。部署到 Vercel 并关联 Postgres 数据库后，
// 这些环境变量会自动注入，不需要手填连接串。
import { sql } from "@vercel/postgres";

export async function createUser(email, passwordHash) {
  const { rows } = await sql`
    INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})
    RETURNING id, email
  `;
  return rows[0];
}

export async function getUserByEmail(email) {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await sql`SELECT id, email FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function saveProfile(userId, { nickname, age, gender, avatarName, avatarEmoji, avatarCode }) {
  await sql`
    INSERT INTO profiles (user_id, nickname, age, gender, avatar_name, avatar_emoji, avatar_code, updated_at)
    VALUES (${userId}, ${nickname}, ${age}, ${gender}, ${avatarName || null}, ${avatarEmoji || null}, ${avatarCode || null}, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET nickname = ${nickname}, age = ${age}, gender = ${gender},
        avatar_name = COALESCE(${avatarName || null}, profiles.avatar_name),
        avatar_emoji = COALESCE(${avatarEmoji || null}, profiles.avatar_emoji),
        avatar_code = COALESCE(${avatarCode || null}, profiles.avatar_code),
        updated_at = NOW()
  `;
}

export async function getProfile(userId) {
  const { rows } = await sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

export async function saveQuestionnaire(userId, { domains, crisisTriggered }) {
  const { rows } = await sql`
    INSERT INTO questionnaires (user_id, domains, crisis_triggered)
    VALUES (${userId}, ${JSON.stringify(domains)}, ${crisisTriggered})
    RETURNING id, created_at
  `;
  return rows[0];
}

export async function getLatestQuestionnaire(userId) {
  const { rows } = await sql`
    SELECT * FROM questionnaires WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!rows[0]) return null;
  return { ...rows[0], domains: rows[0].domains, crisis_triggered: rows[0].crisis_triggered };
}

export async function getScenarioLog(userId, dateStr) {
  const { rows } = await sql`
    SELECT * FROM scenario_logs WHERE user_id = ${userId} AND scenario_date = ${dateStr} LIMIT 1
  `;
  if (!rows[0]) return null;
  return { ...rows[0], choices: rows[0].choices, completed: rows[0].completed };
}

export async function upsertScenarioProgress(userId, dateStr, scenarioId, stepIndex, choices, completed) {
  await sql`
    INSERT INTO scenario_logs (user_id, scenario_date, scenario_id, step_index, choices, completed, updated_at)
    VALUES (${userId}, ${dateStr}, ${scenarioId}, ${stepIndex}, ${JSON.stringify(choices)}, ${completed}, NOW())
    ON CONFLICT (user_id, scenario_date) DO UPDATE
    SET step_index = ${stepIndex}, choices = ${JSON.stringify(choices)}, completed = ${completed}, updated_at = NOW()
  `;
}

export async function getScenarioHistory(userId, limit = 14) {
  const { rows } = await sql`
    SELECT * FROM scenario_logs WHERE user_id = ${userId}
    ORDER BY scenario_date DESC LIMIT ${limit}
  `;
  return rows;
}
