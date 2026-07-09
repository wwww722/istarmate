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

// ===== 心情打卡 =====
export async function saveMoodLog(userId, dateStr, mood) {
  await sql`
    INSERT INTO mood_logs (user_id, log_date, mood)
    VALUES (${userId}, ${dateStr}, ${mood})
    ON CONFLICT (user_id, log_date) DO UPDATE SET mood = ${mood}
  `;
}

export async function getMoodLogs(userId, limit = 14) {
  const rows = await sql`
    SELECT * FROM mood_logs WHERE user_id = ${userId}
    ORDER BY log_date DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== AI课程对话历史 =====
export async function saveAiCourseSession(userId, messages) {
  await sql`
    INSERT INTO ai_course_sessions (user_id, messages, updated_at)
    VALUES (${userId}, ${JSON.stringify(messages)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET messages = ${JSON.stringify(messages)}, updated_at = NOW()
  `;
}

export async function getAiCourseSession(userId) {
  const rows = await sql`SELECT * FROM ai_course_sessions WHERE user_id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

// ===== 成就系统 =====
export async function getAchievements(userId) {
  const rows = await sql`SELECT * FROM achievements WHERE user_id = ${userId}`;
  return rows;
}

export async function unlockAchievement(userId, achievementId) {
  try {
    await sql`
      INSERT INTO achievements (user_id, achievement_id)
      VALUES (${userId}, ${achievementId})
      ON CONFLICT DO NOTHING
    `;
    return true;
  } catch { return false; }
}

export async function checkStreak(userId) {
  const rows = await sql`
    SELECT log_date FROM mood_logs WHERE user_id = ${userId}
    ORDER BY log_date DESC LIMIT 30
  `;
  if (!rows.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const dateStr = expected.toISOString().slice(0, 10);
    if (rows[i].log_date.toISOString?.().slice(0,10) === dateStr || rows[i].log_date === dateStr) {
      streak++;
    } else break;
  }
  return streak;
}

export async function countCompletedScenarios(userId) {
  const rows = await sql`
    SELECT COUNT(*) as count FROM scenario_logs
    WHERE user_id = ${userId} AND completed = TRUE
  `;
  return Number(rows[0]?.count || 0);
}

// 获取最近一次问卷的日期（用于重测提醒）
export async function getLatestQuestionnaireDate(userId) {
  const rows = await sql`
    SELECT created_at FROM questionnaires WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0]?.created_at || null;
}

// ===== 星伴对话摘要（记忆）=====
export async function saveChatSummary(userId, summary) {
  await sql`
    INSERT INTO chat_summaries (user_id, summary, session_date)
    VALUES (${userId}, ${summary}, CURRENT_DATE)
  `;
}

export async function getRecentChatSummaries(userId, limit = 5) {
  const rows = await sql`
    SELECT summary, session_date FROM chat_summaries
    WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== 每周情绪报告 =====
export async function saveWeeklyReport(userId, weekStart, report) {
  await sql`
    INSERT INTO weekly_reports (user_id, week_start, report)
    VALUES (${userId}, ${weekStart}, ${JSON.stringify(report)})
    ON CONFLICT (user_id, week_start) DO UPDATE SET report = ${JSON.stringify(report)}
  `;
}

export async function getWeeklyReports(userId, limit = 8) {
  const rows = await sql`
    SELECT * FROM weekly_reports WHERE user_id = ${userId}
    ORDER BY week_start DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== 用户反馈 =====
export async function saveFeedback(userId, context, rating) {
  await sql`
    INSERT INTO feedback_logs (user_id, context, rating, context_date)
    VALUES (${userId}, ${context}, ${rating}, CURRENT_DATE)
  `;
}

// ===== AI课程代码片段 =====
export async function saveCodeSnippet(userId, title, code, language = "html") {
  const rows = await sql`
    INSERT INTO code_snippets (user_id, title, code, language)
    VALUES (${userId}, ${title}, ${code}, ${language})
    RETURNING id, title, created_at
  `;
  return rows[0];
}

export async function getCodeSnippets(userId) {
  const rows = await sql`
    SELECT id, title, language, created_at, LEFT(code, 200) as preview
    FROM code_snippets WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 20
  `;
  return rows;
}

export async function getCodeSnippet(userId, id) {
  const rows = await sql`
    SELECT * FROM code_snippets WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function deleteCodeSnippet(userId, id) {
  await sql`DELETE FROM code_snippets WHERE id = ${id} AND user_id = ${userId}`;
}
