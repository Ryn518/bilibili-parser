-- Supabase / PostgreSQL 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行，或由应用首次连接时自动创建

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_courses (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bvid TEXT NOT NULL,
  title TEXT,
  cover TEXT,
  daily_min INTEGER,
  completed_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_snapshot JSONB,
  updated_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bvid)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_cache JSONB,
  continue_dismiss JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);
