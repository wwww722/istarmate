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

// ===== 小剧场每日摘要（用于续集功能）=====
export async function saveScenarioDaySummary(userId, dateStr, summary, scenarioTitle) {
  await sql`
    UPDATE scenario_logs
    SET choices = jsonb_set(
      COALESCE(choices, '[]'::jsonb),
      '{-1}',
      ${JSON.stringify({ _daySummary: summary, _scenarioTitle: scenarioTitle })}::jsonb,
      true
    )
    WHERE user_id = ${userId} AND scenario_date = ${dateStr}
  `;
}

export async function getRecentScenarioSummaries(userId, limit = 5) {
  const rows = await sql`
    SELECT scenario_date, choices FROM scenario_logs
    WHERE user_id = ${userId} AND completed = TRUE
    ORDER BY scenario_date DESC LIMIT ${limit}
  `;
  return rows.map(r => {
    const choices = Array.isArray(r.choices) ? r.choices : [];
    const meta = choices.find(c => c && c._daySummary);
    return {
      date: r.scenario_date,
      summary: meta?._daySummary || null,
      title: meta?._scenarioTitle || null,
    };
  }).filter(r => r.summary);
}

// ===== 每月成长报告 =====
export async function saveMonthlyReport(userId, monthKey, report) {
  await sql`
    INSERT INTO weekly_reports (user_id, week_start, report)
    VALUES (${userId}, ${monthKey}, ${JSON.stringify({ ...report, type: "monthly" })})
    ON CONFLICT (user_id, week_start) DO UPDATE SET report = ${JSON.stringify({ ...report, type: "monthly" })}
  `;
}

export async function getMonthlyReports(userId) {
  const rows = await sql`
    SELECT * FROM weekly_reports
    WHERE user_id = ${userId} AND (report->>'type') = 'monthly'
    ORDER BY week_start DESC LIMIT 12
  `;
  return rows;
}

// ===== 小剧场故事记录（跨天续集用）=====
export async function saveScenarioStoryLog(userId, title, summary) {
  await sql`
    INSERT INTO scenario_story_logs (user_id, title, summary, log_date)
    VALUES (${userId}, ${title}, ${summary}, CURRENT_DATE)
    ON CONFLICT (user_id, log_date) DO UPDATE
    SET title = ${title}, summary = ${summary}
  `;
}

export async function getRecentStoryLogs(userId, limit = 5) {
  const rows = await sql`
    SELECT title, summary, log_date FROM scenario_story_logs
    WHERE user_id = ${userId}
    ORDER BY log_date DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== 小剧场故事记忆 =====
export async function saveScenarioStoryMemory(userId, summary) {
  await sql`
    INSERT INTO chat_summaries (user_id, summary, session_date)
    VALUES (${userId}, ${'[剧场] ' + summary}, CURRENT_DATE)
  `;
}

export async function getScenarioStoryMemories(userId, limit = 3) {
  const rows = await sql`
    SELECT summary, session_date FROM chat_summaries
    WHERE user_id = ${userId} AND summary LIKE '[剧场]%'
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map(r => ({ ...r, summary: r.summary.replace('[剧场] ', '') }));
}
// ===== 作品展示墙 =====
export async function getPublicSnippets(limit = 30) {
  const rows = await sql`
    SELECT cs.id, cs.title, cs.language, cs.description,
           LEFT(cs.code, 300) as preview, cs.created_at
    FROM code_snippets cs
    WHERE cs.is_public = TRUE
    ORDER BY cs.created_at DESC LIMIT ${limit}
  `;
  return rows;
}

export async function toggleSnippetPublic(userId, snippetId, isPublic, description) {
  await sql`
    UPDATE code_snippets
    SET is_public = ${isPublic}, description = ${description || ''}
    WHERE id = ${snippetId} AND user_id = ${userId}
  `;
}

// ===== 危机检测 =====
export async function saveCrisisLog(userId, messageSnippet, keywords) {
  await sql`
    INSERT INTO crisis_logs (user_id, message_snippet, keywords)
    VALUES (${userId}, ${messageSnippet.slice(0, 200)}, ${keywords})
  `;
}

// ===== 邀请码 =====
export async function getOrCreateInviteCode(userId) {
  const existing = await sql`
    SELECT code FROM invite_codes WHERE owner_user_id = ${userId} LIMIT 1
  `;
  if (existing[0]) return existing[0].code;
  const code = 'ISM' + userId + Math.random().toString(36).slice(2, 6).toUpperCase();
  await sql`
    INSERT INTO invite_codes (code, owner_user_id)
    VALUES (${code}, ${userId})
    ON CONFLICT (code) DO NOTHING
  `;
  return code;
}

export async function useInviteCode(code, newUserId) {
  const codeRow = await sql`
    SELECT owner_user_id FROM invite_codes WHERE code = ${code} LIMIT 1
  `;
  if (!codeRow[0]) return null;
  if (codeRow[0].owner_user_id === newUserId) return null; // 不能用自己的码
  try {
    await sql`
      INSERT INTO invite_uses (code, used_by_user_id)
      VALUES (${code}, ${newUserId})
    `;
    return codeRow[0].owner_user_id; // 返回邀请人ID
  } catch {
    return null; // 已经用过了
  }
}

export async function getInviteStats(userId) {
  const rows = await sql`
    SELECT COUNT(*) as count FROM invite_uses iu
    JOIN invite_codes ic ON ic.code = iu.code
    WHERE ic.owner_user_id = ${userId}
  `;
  return Number(rows[0]?.count || 0);
}
