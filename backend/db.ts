import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('未配置 DATABASE_URL');
  }
  if (!sql) {
    sql = postgres(url, {
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
      prepare: false,
      max: 1
    });
  }
  return sql;
}

export async function ensureSchema() {
  if (!isDatabaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getSql();
      await db`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`
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
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          plan_cache JSONB,
          continue_dismiss JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at BIGINT NOT NULL DEFAULT 0
        )
      `;
    })();
  }
  await schemaReady;
}
