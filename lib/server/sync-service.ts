import type { PlanCache, ProgressRecord } from '@/lib/types';
import { ensureSchema, getSql, isDatabaseConfigured } from './db';

export interface CloudSyncPayload {
  progress: Record<string, ProgressRecord>;
  planCache: PlanCache | null;
  continueDismiss: Record<string, boolean>;
  syncedAt: number;
}

function rowToProgress(row: {
  bvid: string;
  title: string | null;
  cover: string | null;
  daily_min: number | null;
  completed_days: number[];
  plan_snapshot: PlanCache | null;
  updated_at: number;
}): ProgressRecord {
  return {
    completedDays: Array.isArray(row.completed_days) ? row.completed_days : [],
    dailyMin: row.daily_min ?? undefined,
    title: row.title ?? undefined,
    cover: row.cover ?? undefined,
    updatedAt: Number(row.updated_at) || 0,
    planSnapshot: row.plan_snapshot ?? undefined
  };
}

export async function pullUserSync(userId: string): Promise<CloudSyncPayload> {
  if (!isDatabaseConfigured()) {
    throw new Error('未配置 DATABASE_URL');
  }
  await ensureSchema();
  const db = getSql();

  const courseRows = await db<
    {
      bvid: string;
      title: string | null;
      cover: string | null;
      daily_min: number | null;
      completed_days: number[];
      plan_snapshot: PlanCache | null;
      updated_at: number;
    }[]
  >`
    SELECT bvid, title, cover, daily_min, completed_days, plan_snapshot, updated_at
    FROM user_courses
    WHERE user_id = ${userId}::uuid
  `;

  const progress: Record<string, ProgressRecord> = {};
  for (const row of courseRows) {
    progress[row.bvid] = rowToProgress(row);
  }

  const settingsRows = await db<
    { plan_cache: PlanCache | null; continue_dismiss: Record<string, boolean>; updated_at: number }[]
  >`
    SELECT plan_cache, continue_dismiss, updated_at
    FROM user_settings
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;

  const settings = settingsRows[0];
  return {
    progress,
    planCache: settings?.plan_cache ?? null,
    continueDismiss: settings?.continue_dismiss ?? {},
    syncedAt: settings?.updated_at ?? Date.now()
  };
}

export async function pushUserSync(userId: string, payload: CloudSyncPayload): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('未配置 DATABASE_URL');
  }
  await ensureSchema();
  const db = getSql();
  const syncedAt = payload.syncedAt || Date.now();

  await db.begin(async (tx) => {
    await tx`DELETE FROM user_courses WHERE user_id = ${userId}::uuid`;

    for (const [bvid, rec] of Object.entries(payload.progress || {})) {
      if (!bvid) continue;
      await tx`
        INSERT INTO user_courses (
          user_id, bvid, title, cover, daily_min, completed_days, plan_snapshot, updated_at
        ) VALUES (
          ${userId}::uuid,
          ${bvid},
          ${rec.title ?? null},
          ${rec.cover ?? null},
          ${rec.dailyMin ?? null},
          ${tx.json(rec.completedDays || [])},
          ${rec.planSnapshot ? tx.json(JSON.parse(JSON.stringify(rec.planSnapshot))) : null},
          ${rec.updatedAt || syncedAt}
        )
      `;
    }

    await tx`
      INSERT INTO user_settings (user_id, plan_cache, continue_dismiss, updated_at)
      VALUES (
        ${userId}::uuid,
        ${payload.planCache ? tx.json(JSON.parse(JSON.stringify(payload.planCache))) : null},
        ${tx.json(payload.continueDismiss || {})},
        ${syncedAt}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        plan_cache = EXCLUDED.plan_cache,
        continue_dismiss = EXCLUDED.continue_dismiss,
        updated_at = EXCLUDED.updated_at
    `;
  });
}

export async function deleteUserCourse(userId: string, bvid: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('未配置 DATABASE_URL');
  }
  await ensureSchema();
  const db = getSql();
  await db`
    DELETE FROM user_courses
    WHERE user_id = ${userId}::uuid AND bvid = ${bvid}
  `;
}

export function isCloudSyncEnabled() {
  return isDatabaseConfigured();
}
