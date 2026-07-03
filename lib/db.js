// lib/db.js
// 用 Neon 的免费云 Postgres，不绑定任何特定托管平台（Netlify/Vercel都能用）。
// 连接串从环境变量 DATABASE_URL 读取。
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function createUser(email, passwordHash) {
  const rows = await sql`
    INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})
    RETURNING id, email
  `;
  return rows[0];
}

export async function getUserByEmail(email) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] || null;
}

export async function getUserById(id) {
  const rows = await sql`SELECT id, email FROM users WHERE id = ${id} LIMIT 1`;
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
  const rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

export async function saveQuestionnaire(userId, { domains, crisisTriggered }) {
  const rows = await sql`
    INSERT INTO questionnaires (user_id, domains, crisis_triggered)
    VALUES (${userId}, ${JSON.stringify(domains)}, ${crisisTriggered})
    RETURNING id, created_at
  `;
  return rows[0];
}

export async function getLatestQuestionnaire(userId) {
  const rows = await sql`
    SELECT * FROM questionnaires WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!rows[0]) return null;
  return { ...rows[0], domains: rows[0].domains, crisis_triggered: rows[0].crisis_triggered };
}

export async function getScenarioLog(userId, dateStr) {
  const rows = await sql`
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
  const rows = await sql`
    SELECT * FROM scenario_logs WHERE user_id = ${userId}
    ORDER BY scenario_date DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== 邮箱验证相关 =====
export async function createEmailVerification(email, token, expiresAt) {
  await sql`
    INSERT INTO email_verifications (email, token, expires_at)
    VALUES (${email}, ${token}, ${expiresAt})
  `;
}

export async function getEmailVerification(email, token) {
  const rows = await sql`
    SELECT * FROM email_verifications
    WHERE email = ${email} AND token = ${token} AND used = FALSE AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] || null;
}

export async function markVerificationUsed(id) {
  await sql`UPDATE email_verifications SET used = TRUE WHERE id = ${id}`;
}

export async function markUserVerified(email) {
  await sql`UPDATE users SET email_verified = TRUE WHERE email = ${email}`;
}
