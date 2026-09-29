import { ensureSchema, getSql, isDatabaseConfigured } from './db';

export interface DbUser {
  id: string;
  username: string;
  salt: string;
  password_hash: string;
}

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureSchema();
  const db = getSql();
  const rows = await db<DbUser[]>`
    SELECT id, username, salt, password_hash
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createUser(username: string, salt: string, passwordHash: string): Promise<DbUser> {
  if (!isDatabaseConfigured()) {
    throw new Error('未配置 DATABASE_URL');
  }
  await ensureSchema();
  const db = getSql();
  const rows = await db<DbUser[]>`
    INSERT INTO users (username, salt, password_hash)
    VALUES (${username}, ${salt}, ${passwordHash})
    RETURNING id, username, salt, password_hash
  `;
  return rows[0];
}

export async function usernameExists(username: string): Promise<boolean> {
  const user = await findUserByUsername(username);
  return !!user;
}
