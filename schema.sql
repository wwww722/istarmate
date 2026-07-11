-- schema.sql
-- 在 Vercel Postgres 控制台的 Query 页签里粘贴执行一次即可建好表。

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  age INTEGER,
  gender TEXT,
  avatar_name TEXT,
  avatar_emoji TEXT,
  avatar_code TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaires (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  domains JSONB NOT NULL,
  crisis_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scenario_date DATE NOT NULL,
  scenario_id TEXT NOT NULL,
  step_index INTEGER DEFAULT 0,
  choices JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, scenario_date)
);

-- 邮箱验证码表（用于注册时验证邮箱真实性）
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- users表加email_verified字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 每日心情打卡记录
CREATE TABLE IF NOT EXISTS mood_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- AI课程对话历史（每个用户保存最近一段对话）
CREATE TABLE IF NOT EXISTS ai_course_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 成就记录
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 星伴对话摘要（记忆功能）
CREATE TABLE IF NOT EXISTS chat_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 每周情绪报告
CREATE TABLE IF NOT EXISTS weekly_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- 用户反馈
CREATE TABLE IF NOT EXISTS feedback_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  context TEXT NOT NULL, -- 'scenario' or 'chat'
  rating INTEGER NOT NULL, -- 1=thumbsup, -1=thumbsdown
  context_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI课程代码片段保存
CREATE TABLE IF NOT EXISTS code_snippets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'html',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 小剧场故事日志（跨天续集）
CREATE TABLE IF NOT EXISTS scenario_story_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- 每月成长报告
CREATE TABLE IF NOT EXISTS monthly_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- 格式 "2026-07"
  report JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

-- 作品展示墙：给code_snippets加公开字段
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS author_display TEXT; -- 匿名显示名，如"松鼠#018"

-- 危机日志
CREATE TABLE IF NOT EXISTS crisis_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message_snippet TEXT,
  risk_level INTEGER DEFAULT 1, -- 1=警告 2=严重
  context TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 邀请码
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_uses (
  id SERIAL PRIMARY KEY,
  invite_code TEXT NOT NULL,
  inviter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  invitee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 作品展示墙：code_snippets加公开字段
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 危机检测日志
CREATE TABLE IF NOT EXISTS crisis_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message_snippet TEXT NOT NULL,
  keywords TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 邀请码
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 邀请使用记录
CREATE TABLE IF NOT EXISTS invite_uses (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  used_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(used_by_user_id)
);

-- 代码版本历史
CREATE TABLE IF NOT EXISTS code_versions (
  id SERIAL PRIMARY KEY,
  snippet_id INTEGER REFERENCES code_snippets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  version_note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 代码版本历史
CREATE TABLE IF NOT EXISTS code_versions (
  id SERIAL PRIMARY KEY,
  snippet_id INTEGER REFERENCES code_snippets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  version_note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 情绪日记：给mood_logs加备注字段
ALTER TABLE mood_logs ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- 一键分享：给code_snippets加公开分享短ID
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- AI课程学习进度
CREATE TABLE IF NOT EXISTS course_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL DEFAULT 1,
  completed_stages TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
