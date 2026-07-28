-- ============================================
-- istarmate 超级升级 2026-07-28
-- 把这段 SQL 在 Neon 控制台 / Vercel Postgres Query 里运行一次即可
-- ============================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,
  family_inviter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  stardust INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  current_league TEXT NOT NULL DEFAULT 'bronze_star',
  current_energy INTEGER NOT NULL DEFAULT 20,
  last_energy_refill DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id SERIAL PRIMARY KEY,
  task_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 20,
  reward_stardust INTEGER NOT NULL DEFAULT 5,
  icon TEXT NOT NULL DEFAULT '⭐'
);
INSERT INTO daily_tasks (task_code, title, reward_xp, reward_stardust, icon) VALUES
  ('chat5',     '和星野 / 川 聊 5 句',     20, 5,  '💬'),
  ('breathing', '完成一次呼吸练习',         15, 5,  '🌬️'),
  ('runcode',   '在编辑器里运行一次代码',   20, 10, '▶️'),
  ('checkin',   '今日心情打卡',             10, 3,  '📝')
ON CONFLICT (task_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS daily_task_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES daily_tasks(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, task_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_task_user_date ON daily_task_completions(user_id, log_date);

CREATE TABLE IF NOT EXISTS stardust_shop_items (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'avatar',
  payload JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO stardust_shop_items (code, title, description, price, category, payload) VALUES
  ('avatar_hoshino_starry',  '星野 · 星空连衣裙', '限定版星空连衣裙头像', 50,  'avatar', '{"emoji":"👗","theme":"starry"}'),
  ('avatar_chuan_hoodie',    '川 · 程序员卫衣',  '复古程序员卫衣头像',   50,  'avatar', '{"emoji":"🧥","theme":"code"}'),
  ('project_theme_aurora',   '极光 · 作品主题',  '作品展示页面极光渐变',  80,  'project_theme', '{"gradient":"aurora"}'),
  ('badge_first_streak',     '七日连胜徽章',     '连续登录满7天专属',    0,   'badge', '{"streak":7}')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_inventory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES stardust_shop_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS xp_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_user_time ON xp_logs(user_id, created_at DESC);
