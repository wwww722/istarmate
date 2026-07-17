// lib/db.js
// 用 Neon 的免费云 Postgres，不绑定任何特定托管平台（Netlify/Vercel都能用）。
// 连接串从环境变量 DATABASE_URL 读取。
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function createUser(email, passwordHash, securityQuestion = null, securityAnswerHash = null) {
  const rows = await sql`
    INSERT INTO users (email, password_hash, security_question, security_answer_hash)
    VALUES (${email}, ${passwordHash}, ${securityQuestion}, ${securityAnswerHash})
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
export async function saveMoodLog(userId, dateStr, mood, note = "") {
  await sql`
    INSERT INTO mood_logs (user_id, log_date, mood, note)
    VALUES (${userId}, ${dateStr}, ${mood}, ${note})
    ON CONFLICT (user_id, log_date) DO UPDATE SET mood = ${mood}, note = ${note}
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

// ===== 代码版本历史 =====
export async function saveCodeVersion(userId, snippetId, code, versionNote = "") {
  await sql`
    INSERT INTO code_versions (snippet_id, user_id, code, version_note)
    VALUES (${snippetId}, ${userId}, ${code}, ${versionNote})
  `;
  // 每个项目最多保留10个版本，删掉最旧的
  await sql`
    DELETE FROM code_versions
    WHERE snippet_id = ${snippetId}
      AND id NOT IN (
        SELECT id FROM code_versions
        WHERE snippet_id = ${snippetId}
        ORDER BY created_at DESC LIMIT 10
      )
  `;
}

export async function getCodeVersions(userId, snippetId) {
  const rows = await sql`
    SELECT id, version_note, created_at, LEFT(code, 100) as preview
    FROM code_versions
    WHERE snippet_id = ${snippetId} AND user_id = ${userId}
    ORDER BY created_at DESC LIMIT 10
  `;
  return rows;
}

export async function getCodeVersion(userId, versionId) {
  const rows = await sql`
    SELECT * FROM code_versions WHERE id = ${versionId} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function updateCodeSnippet(userId, snippetId, code) {
  await sql`
    UPDATE code_snippets SET code = ${code}
    WHERE id = ${snippetId} AND user_id = ${userId}
  `;
}

// ===== 账号设置 =====
export async function updateUserEmail(userId, newEmail) {
  await sql`UPDATE users SET email = ${newEmail} WHERE id = ${userId}`;
}

export async function updateUserPassword(userId, passwordHash) {
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function deleteUserAccount(userId) {
  // 外键都是 ON DELETE CASCADE，删用户会连带删掉所有关联数据
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

// ===== 连续低落检测（星伴主动关怀）=====
export async function getRecentMoodsForCare(userId) {
  const rows = await sql`
    SELECT mood, log_date FROM mood_logs
    WHERE user_id = ${userId}
    ORDER BY log_date DESC LIMIT 5
  `;
  return rows;
}

// ===== 情绪日记 =====
export async function getMoodDiary(userId, limit = 30) {
  const rows = await sql`
    SELECT log_date, mood, note FROM mood_logs
    WHERE user_id = ${userId} AND note IS NOT NULL AND note != ''
    ORDER BY log_date DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== AI课程学习进度 =====
export async function getCourseProgress(userId) {
  const rows = await sql`
    SELECT * FROM course_progress WHERE user_id = ${userId} LIMIT 1
  `;
  if (rows[0]) return rows[0];
  // 初始化
  await sql`
    INSERT INTO course_progress (user_id, stage, completed_stages)
    VALUES (${userId}, 1, '')
    ON CONFLICT (user_id) DO NOTHING
  `;
  return { stage: 1, completed_stages: '' };
}

export async function completeCourseStage(userId, stageNum) {
  const current = await getCourseProgress(userId);
  const completed = (current.completed_stages || '').split(',').filter(Boolean);
  if (!completed.includes(String(stageNum))) {
    completed.push(String(stageNum));
  }
  const nextStage = Math.max(current.stage, stageNum + 1);
  await sql`
    INSERT INTO course_progress (user_id, stage, completed_stages, updated_at)
    VALUES (${userId}, ${nextStage}, ${completed.join(',')}, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET stage = ${nextStage}, completed_stages = ${completed.join(',')}, updated_at = NOW()
  `;
  return { stage: nextStage, completed_stages: completed.join(',') };
}

// ===== 一键分享作品 =====
export async function getOrCreateShareId(userId, snippetId) {
  const existing = await sql`
    SELECT share_id FROM code_snippets
    WHERE id = ${snippetId} AND user_id = ${userId} LIMIT 1
  `;
  if (existing[0]?.share_id) return existing[0].share_id;
  const shareId = Math.random().toString(36).slice(2, 8);
  await sql`
    UPDATE code_snippets SET share_id = ${shareId}
    WHERE id = ${snippetId} AND user_id = ${userId}
  `;
  return shareId;
}

export async function getSnippetByShareId(shareId) {
  const rows = await sql`
    SELECT title, code, language, created_at
    FROM code_snippets WHERE share_id = ${shareId} LIMIT 1
  `;
  return rows[0] || null;
}

// ===== 密码找回（安全问题）=====
export async function getSecurityQuestion(email) {
  const rows = await sql`
    SELECT security_question FROM users WHERE email = ${email} LIMIT 1
  `;
  return rows[0]?.security_question || null;
}

export async function verifySecurityAnswer(email) {
  const rows = await sql`
    SELECT id, security_answer_hash FROM users WHERE email = ${email} LIMIT 1
  `;
  return rows[0] || null;
}

export async function resetPasswordByEmail(email, newPasswordHash) {
  await sql`
    UPDATE users SET password_hash = ${newPasswordHash} WHERE email = ${email}
  `;
}

export async function setSecurityQuestion(userId, question, answerHash) {
  await sql`
    UPDATE users SET security_question = ${question}, security_answer_hash = ${answerHash}
    WHERE id = ${userId}
  `;
}

// ===== 管理后台 =====
export async function isAdmin(userId) {
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`;
  return rows[0]?.is_admin === true;
}

export async function getAdminStats() {
  const [userCount, todayActive, weekActive, crisisCount, feedbackStats] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(DISTINCT user_id) as count FROM mood_logs WHERE log_date = CURRENT_DATE`,
    sql`SELECT COUNT(DISTINCT user_id) as count FROM mood_logs WHERE log_date > CURRENT_DATE - INTERVAL '7 days'`,
    sql`SELECT COUNT(*) as count FROM crisis_logs WHERE created_at > NOW() - INTERVAL '30 days'`,
    sql`SELECT context, rating, COUNT(*) as count FROM feedback_logs GROUP BY context, rating`,
  ]);
  return {
    totalUsers: Number(userCount[0]?.count || 0),
    todayActive: Number(todayActive[0]?.count || 0),
    weekActive: Number(weekActive[0]?.count || 0),
    crisisCount30d: Number(crisisCount[0]?.count || 0),
    feedback: feedbackStats,
  };
}

export async function getRecentCrisisLogs(limit = 50) {
  const rows = await sql`
    SELECT cl.id, cl.user_id, cl.message_snippet, cl.keywords, cl.created_at,
           u.email
    FROM crisis_logs cl
    LEFT JOIN users u ON u.id = cl.user_id
    ORDER BY cl.created_at DESC LIMIT ${limit}
  `;
  return rows;
}

export async function getSignupTrend() {
  const rows = await sql`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  return rows;
}

// ===== 星伴聊天历史（完整对话）=====
export async function saveCompanionSession(userId, messages) {
  await sql`
    INSERT INTO companion_sessions (user_id, messages, updated_at)
    VALUES (${userId}, ${JSON.stringify(messages)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET messages = ${JSON.stringify(messages)}, updated_at = NOW()
  `;
}

export async function getCompanionSession(userId) {
  const rows = await sql`
    SELECT messages FROM companion_sessions WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.messages || [];
}

export async function clearCompanionSession(userId) {
  await sql`DELETE FROM companion_sessions WHERE user_id = ${userId}`;
}

// ===== 多会话管理 =====
export async function listConversations(userId, kind = "companion") {
  const rows = await sql`
    SELECT id, title, updated_at, pinned,
           jsonb_array_length(messages) as msg_count
    FROM conversations
    WHERE user_id = ${userId} AND kind = ${kind} AND archived = FALSE
    ORDER BY pinned DESC, updated_at DESC LIMIT 50
  `;
  return rows;
}

export async function createConversation(userId, kind = "companion", title = "新对话", meta = {}) {
  const rows = await sql`
    INSERT INTO conversations (user_id, kind, title, messages, meta)
    VALUES (${userId}, ${kind}, ${title}, '[]'::jsonb, ${JSON.stringify(meta)})
    RETURNING id, title, created_at, updated_at
  `;
  return rows[0];
}

export async function getConversation(userId, convId) {
  const rows = await sql`
    SELECT id, kind, title, messages, meta FROM conversations
    WHERE id = ${convId} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function updateConversation(userId, convId, messages, meta = null) {
  const trimmed = messages.slice(-60);
  if (meta !== null) {
    await sql`
      UPDATE conversations
      SET messages = ${JSON.stringify(trimmed)}, meta = ${JSON.stringify(meta)}, updated_at = NOW()
      WHERE id = ${convId} AND user_id = ${userId}
    `;
  } else {
    await sql`
      UPDATE conversations
      SET messages = ${JSON.stringify(trimmed)}, updated_at = NOW()
      WHERE id = ${convId} AND user_id = ${userId}
    `;
  }
}

export async function renameConversation(userId, convId, title) {
  await sql`
    UPDATE conversations SET title = ${title.slice(0, 60)}, updated_at = NOW()
    WHERE id = ${convId} AND user_id = ${userId}
  `;
}

export async function deleteConversation(userId, convId) {
  await sql`DELETE FROM conversations WHERE id = ${convId} AND user_id = ${userId}`;
}

// ===== 会话置顶/归档 =====
export async function togglePinConversation(userId, convId, pinned) {
  await sql`
    UPDATE conversations SET pinned = ${pinned}
    WHERE id = ${convId} AND user_id = ${userId}
  `;
}

export async function archiveConversation(userId, convId, archived) {
  await sql`
    UPDATE conversations SET archived = ${archived}
    WHERE id = ${convId} AND user_id = ${userId}
  `;
}

export async function listArchivedConversations(userId, kind = "companion") {
  const rows = await sql`
    SELECT id, title, updated_at, jsonb_array_length(messages) as msg_count
    FROM conversations
    WHERE user_id = ${userId} AND kind = ${kind} AND archived = TRUE
    ORDER BY updated_at DESC LIMIT 50
  `;
  return rows;
}

// ===== 消息搜索 =====
export async function searchConversations(userId, keyword, kind = "companion") {
  const kw = `%${keyword}%`;
  const rows = await sql`
    SELECT id, title, updated_at,
           jsonb_array_length(messages) as msg_count,
           messages
    FROM conversations
    WHERE user_id = ${userId} AND kind = ${kind} AND archived = FALSE
      AND (title ILIKE ${kw} OR messages::text ILIKE ${kw})
    ORDER BY updated_at DESC LIMIT 20
  `;
  // 提取匹配的消息片段
  return rows.map(r => {
    const msgs = Array.isArray(r.messages) ? r.messages : [];
    const hits = [];
    for (const m of msgs) {
      const text = typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter(p => p?.type === "text").map(p => p.text).join("")
          : "";
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        hits.push({ role: m.role, snippet: text.slice(0, 100) });
        if (hits.length >= 2) break;
      }
    }
    return { id: r.id, title: r.title, updated_at: r.updated_at, msg_count: r.msg_count, hits };
  });
}

// ===== 安全日志 =====
export async function logSafetyEvent(userId, eventType, snippet) {
  await sql`
    INSERT INTO safety_logs (user_id, event_type, snippet)
    VALUES (${userId}, ${eventType}, ${String(snippet || "").slice(0, 300)})
  `;
}

export async function getSafetyLogs(limit = 50) {
  const rows = await sql`
    SELECT sl.id, sl.user_id, sl.event_type, sl.snippet, sl.created_at, u.email
    FROM safety_logs sl LEFT JOIN users u ON u.id = sl.user_id
    ORDER BY sl.created_at DESC LIMIT ${limit}
  `;
  return rows;
}

// ===== 使用埋点 =====
export async function logUsage(userId, feature) {
  await sql`INSERT INTO usage_events (user_id, feature) VALUES (${userId}, ${feature})`;
}

export async function getUsageStats(days = 30) {
  const rows = await sql`
    SELECT feature, COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM usage_events
    WHERE created_at > NOW() - (${days} || ' days')::interval
    GROUP BY feature ORDER BY count DESC
  `;
  return rows;
}

// ===== 留存曲线 =====
export async function getRetentionCurve() {
  const rows = await sql`
    WITH cohort AS (
      SELECT id, DATE(created_at) as signup_date FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
    ),
    activity AS (
      SELECT DISTINCT user_id, log_date FROM mood_logs
    )
    SELECT
      c.signup_date,
      COUNT(DISTINCT c.id) as cohort_size,
      COUNT(DISTINCT CASE WHEN a.log_date = c.signup_date + 1 THEN c.id END) as day1,
      COUNT(DISTINCT CASE WHEN a.log_date BETWEEN c.signup_date + 1 AND c.signup_date + 7 THEN c.id END) as week1,
      COUNT(DISTINCT CASE WHEN a.log_date BETWEEN c.signup_date + 1 AND c.signup_date + 30 THEN c.id END) as month1
    FROM cohort c LEFT JOIN activity a ON a.user_id = c.id
    GROUP BY c.signup_date ORDER BY c.signup_date DESC LIMIT 14
  `;
  return rows;
}

// ===== 最后活跃时间（"好久不见"关怀）=====
export async function touchLastSeen(userId) {
  await sql`UPDATE users SET last_seen_at = NOW() WHERE id = ${userId}`;
}

export async function getDaysAway(userId) {
  const rows = await sql`
    SELECT EXTRACT(DAY FROM NOW() - last_seen_at)::int as days
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0]?.days || 0;
}

// ===== 情绪趋势预测 =====
export async function getMoodTrend(userId) {
  const rows = await sql`
    SELECT log_date, mood FROM mood_logs
    WHERE user_id = ${userId}
    ORDER BY log_date DESC LIMIT 14
  `;
  if (rows.length < 5) return null;

  const score = { great: 5, ok: 4, meh: 3, down: 2, bad: 1 };
  const vals = rows.map(r => score[r.mood] || 3);

  // 最近5天 vs 之前
  const recent = vals.slice(0, 5);
  const earlier = vals.slice(5);
  if (earlier.length === 0) return null;

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const delta = avgRecent - avgEarlier;

  let trend = "stable";
  if (delta <= -0.7) trend = "declining";
  else if (delta >= 0.7) trend = "improving";

  return {
    trend,
    avgRecent: Math.round(avgRecent * 10) / 10,
    avgEarlier: Math.round(avgEarlier * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    lowStreak: vals.slice(0, 5).filter(v => v <= 2).length,
  };
}

// ===== 结构化记忆 =====
export async function upsertMemory(userId, category, key, detail, importance = 1) {
  await sql`
    INSERT INTO user_memories (user_id, category, key, detail, importance, last_mentioned)
    VALUES (${userId}, ${category}, ${key}, ${detail}, ${importance}, NOW())
    ON CONFLICT (user_id, category, key)
    DO UPDATE SET detail = ${detail}, importance = GREATEST(user_memories.importance, ${importance}), last_mentioned = NOW()
  `;
}

export async function getMemories(userId, limit = 20) {
  const rows = await sql`
    SELECT category, key, detail, importance FROM user_memories
    WHERE user_id = ${userId}
    ORDER BY importance DESC, last_mentioned DESC LIMIT ${limit}
  `;
  return rows;
}

export async function deleteMemory(userId, category, key) {
  await sql`DELETE FROM user_memories WHERE user_id = ${userId} AND category = ${category} AND key = ${key}`;
}

export async function getAllMemories(userId) {
  const rows = await sql`
    SELECT id, category, key, detail, importance, last_mentioned
    FROM user_memories WHERE user_id = ${userId}
    ORDER BY category, importance DESC
  `;
  return rows;
}

// ===== 成长可见化 =====
// 本月情绪概览：每天的打卡 + 统计
export async function getMonthlyGrowth(userId) {
  const moods = await sql`
    SELECT log_date, mood, note FROM mood_logs
    WHERE user_id = ${userId} AND log_date > NOW() - INTERVAL '30 days'
    ORDER BY log_date ASC
  `;

  const score = { great: 5, ok: 4, meh: 3, down: 2, bad: 1 };
  const counts = { great: 0, ok: 0, meh: 0, down: 0, bad: 0 };
  let sum = 0, n = 0;
  for (const m of moods) {
    if (counts[m.mood] !== undefined) counts[m.mood]++;
    if (score[m.mood]) { sum += score[m.mood]; n++; }
  }

  // 前15天 vs 后15天，看整体走向
  const half = Math.floor(moods.length / 2);
  const firstHalf = moods.slice(0, half);
  const secondHalf = moods.slice(half);
  const avg = (arr) => {
    const vals = arr.map(m => score[m.mood]).filter(Boolean);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const early = avg(firstHalf);
  const late = avg(secondHalf);
  let direction = "stable";
  if (late - early >= 0.5) direction = "up";
  else if (late - early <= -0.5) direction = "down";

  return {
    days: moods.length,
    checkins: moods.map(m => ({ date: m.log_date, mood: m.mood, note: m.note })),
    counts,
    avgScore: n ? Math.round((sum / n) * 10) / 10 : null,
    direction,
  };
}

// 和星伴聊过的重要时刻：从记忆和摘要里取
export async function getMeaningfulMoments(userId) {
  const memories = await sql`
    SELECT category, key, detail, importance, last_mentioned FROM user_memories
    WHERE user_id = ${userId} AND importance >= 2
    ORDER BY importance DESC, last_mentioned DESC LIMIT 10
  `;
  const summaries = await sql`
    SELECT summary, session_date FROM chat_summaries
    WHERE user_id = ${userId}
    ORDER BY session_date DESC LIMIT 8
  `;
  return { memories, summaries };
}

// ===== 智能记忆筛选 =====
// 根据当前对话内容，挑出最相关的记忆（相关性 + 重要度），而不是一股脑全塞。
export async function getRelevantMemories(userId, recentText, limit = 8) {
  const all = await sql`
    SELECT category, key, detail, importance, last_mentioned FROM user_memories
    WHERE user_id = ${userId}
  `;
  if (all.length === 0) return [];

  const text = (recentText || "").toLowerCase();

  // 给每条记忆打分：关键词命中 + 重要度 + 新近度
  const scored = all.map(m => {
    let score = 0;
    const key = (m.key || "").toLowerCase();
    const detail = (m.detail || "").toLowerCase();

    // 当前对话提到了这个记忆的关键词
    if (text) {
      // key整体命中权重高
      if (key && text.includes(key)) score += 10;
      // detail里的词命中
      const words = detail.split(/[\s，。、！？,.\-]+/).filter(w => w.length >= 2);
      for (const w of words) {
        if (text.includes(w)) score += 2;
      }
      // 用户话里的词命中key
      const userWords = text.split(/[\s，。、！？,.\-]+/).filter(w => w.length >= 2);
      for (const w of userWords) {
        if (key.includes(w)) score += 3;
      }
    }

    // 重要度加权
    score += (m.importance || 1) * 2;

    // 新近度：最近提到的略微加分
    const daysAgo = (Date.now() - new Date(m.last_mentioned).getTime()) / 86400000;
    if (daysAgo < 7) score += 1.5;
    else if (daysAgo < 30) score += 0.5;

    return { ...m, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit).map(({ _score, ...m }) => m);
}

// ===== 话题延续 =====
// 取上一次对话的最后几轮 + 未闭合的话题线索，让星伴能自然接上。
export async function getLastConversationThread(userId, currentConvId = null) {
  // 找最近更新的、不是当前会话的 companion 会话
  const rows = await sql`
    SELECT id, messages, updated_at FROM conversations
    WHERE user_id = ${userId} AND kind = 'companion'
      ${currentConvId ? sql`AND id != ${currentConvId}` : sql``}
      AND jsonb_array_length(messages) >= 2
    ORDER BY updated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return null;

  const conv = rows[0];
  const msgs = Array.isArray(conv.messages) ? conv.messages : [];
  const textOf = (c) => {
    if (typeof c === "string") return c;
    if (Array.isArray(c)) return c.filter(p => p?.type === "text").map(p => p.text || "").join("");
    return "";
  };

  // 取最后4条真实对话（跳过系统开场的括号消息）
  const real = msgs.filter(m => !(m.role === "user" && textOf(m.content).startsWith("（")));
  const tail = real.slice(-4).map(m => ({
    role: m.role,
    text: textOf(m.content).slice(0, 150),
  }));

  // 距离上次对话多久
  const hoursAgo = Math.floor((Date.now() - new Date(conv.updated_at).getTime()) / 3600000);

  return { tail, hoursAgo };
}

// ===== 成长里程碑时间轴 =====
// 从各种记录里提取"第一次"和关键节点，拼成一条成长时间线。
export async function getMilestones(userId) {
  const milestones = [];

  // 第一次聊天（最早的 companion 会话）
  const firstChat = await sql`
    SELECT created_at FROM conversations
    WHERE user_id = ${userId} AND kind = 'companion'
    ORDER BY created_at ASC LIMIT 1
  `;
  if (firstChat[0]) {
    milestones.push({ date: firstChat[0].created_at, emoji: "💬", title: "第一次和星伴聊天", desc: "遇见了一个愿意听你说话的伙伴" });
  }

  // 第一次做代码项目
  const firstCode = await sql`
    SELECT created_at FROM conversations
    WHERE user_id = ${userId} AND kind = 'code'
    ORDER BY created_at ASC LIMIT 1
  `;
  if (firstCode[0]) {
    milestones.push({ date: firstCode[0].created_at, emoji: "💻", title: "第一次用代码星创作", desc: "写下了第一行代码" });
  }

  // 第一次心情打卡
  const firstMood = await sql`
    SELECT log_date FROM mood_logs
    WHERE user_id = ${userId} ORDER BY log_date ASC LIMIT 1
  `;
  if (firstMood[0]) {
    milestones.push({ date: firstMood[0].log_date, emoji: "🌈", title: "第一次心情打卡", desc: "开始认真对待自己的感受" });
  }

  // 连续打卡里程碑：算最长连续天数
  const moodDates = await sql`
    SELECT DISTINCT log_date FROM mood_logs
    WHERE user_id = ${userId} ORDER BY log_date ASC
  `;
  if (moodDates.length >= 3) {
    let maxStreak = 1, cur = 1, streakEndDate = moodDates[0].log_date;
    for (let i = 1; i < moodDates.length; i++) {
      const prev = new Date(moodDates[i - 1].log_date);
      const curr = new Date(moodDates[i].log_date);
      const diff = Math.round((curr - prev) / 86400000);
      if (diff === 1) { cur++; if (cur > maxStreak) { maxStreak = cur; streakEndDate = moodDates[i].log_date; } }
      else cur = 1;
    }
    if (maxStreak >= 3) {
      milestones.push({ date: streakEndDate, emoji: "🔥", title: `连续打卡 ${maxStreak} 天`, desc: "坚持是一件了不起的事" });
    }
  }

  // 保存的作品数
  const projectCount = await sql`
    SELECT COUNT(*) as c, MIN(created_at) as first FROM code_snippets
    WHERE user_id = ${userId}
  `;
  if (projectCount[0] && Number(projectCount[0].c) >= 1) {
    milestones.push({ date: projectCount[0].first, emoji: "🎨", title: "保存了第一个作品", desc: "你的创作被留了下来" });
  }

  // 成就徽章
  const achievements = await sql`
    SELECT achievement_id, unlocked_at FROM achievements
    WHERE user_id = ${userId} AND unlocked_at IS NOT NULL
    ORDER BY unlocked_at ASC LIMIT 10
  `;
  const ACH_NAMES = {
    first_chat: "第一次聊天", first_ai_course: "第一次编程",
    invite_friend: "邀请了朋友", showcase: "作品上墙",
    week_streak: "坚持一周", mood_master: "情绪大师",
  };
  for (const a of achievements) {
    milestones.push({ date: a.unlocked_at, emoji: "🏆", title: ACH_NAMES[a.achievement_id] || "解锁成就", desc: "又前进了一步" });
  }

  // 重要记忆节点（importance=3的）
  const bigMemories = await sql`
    SELECT key, detail, last_mentioned FROM user_memories
    WHERE user_id = ${userId} AND importance >= 3
    ORDER BY last_mentioned ASC LIMIT 5
  `;
  for (const m of bigMemories) {
    milestones.push({ date: m.last_mentioned, emoji: "✨", title: m.key, desc: m.detail });
  }

  // 按时间排序
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  return milestones;
}

// ===== 对话质量评估 =====
export async function saveQualityLog(userId, roleKind, scores) {
  await sql`
    INSERT INTO quality_logs (user_id, role_kind, depth_score, helpfulness_score, safety_ok, issue)
    VALUES (${userId}, ${roleKind}, ${scores.depth || null}, ${scores.helpfulness || null}, ${scores.safety_ok !== false}, ${scores.issue || null})
  `;
}

export async function getQualityStats(days = 30) {
  const rows = await sql`
    SELECT role_kind,
           COUNT(*) as n,
           ROUND(AVG(depth_score), 1) as avg_depth,
           ROUND(AVG(helpfulness_score), 1) as avg_help,
           COUNT(*) FILTER (WHERE safety_ok = FALSE) as safety_issues
    FROM quality_logs
    WHERE created_at > NOW() - (${days} || ' days')::interval
    GROUP BY role_kind
  `;
  const recentIssues = await sql`
    SELECT role_kind, issue, created_at FROM quality_logs
    WHERE issue IS NOT NULL AND created_at > NOW() - (${days} || ' days')::interval
    ORDER BY created_at DESC LIMIT 20
  `;
  return { stats: rows, recentIssues };
}
