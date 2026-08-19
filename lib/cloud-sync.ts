'use client';

import { CONFIG } from './config';
import { normalizePlanDays } from './plan-normalize';
import type { PlanCache, ProgressRecord } from './types';
import { getStorageItem, setStorageItem } from './storage';

export interface CloudSyncPayload {
  progress: Record<string, ProgressRecord>;
  planCache: PlanCache | null;
  continueDismiss: Record<string, boolean>;
  syncedAt: number;
}

let syncToken: string | null = null;
let syncUsername: string | null = null;
let syncEnabled = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

function userKey(base: string, username: string) {
  return `${base}:${username}`;
}

export function configureCloudSync(opts: {
  token: string | null;
  username: string | null;
  enabled: boolean;
}) {
  syncToken = opts.token;
  syncUsername = opts.username;
  syncEnabled = opts.enabled;
  if (!opts.enabled) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function isCloudSyncActive() {
  return syncEnabled && !!syncToken && !!syncUsername;
}

function readContinueDismiss(username: string): Record<string, boolean> {
  return getStorageItem<Record<string, boolean>>(userKey(CONFIG.CONTINUE_DISMISS_KEY, username), {});
}

function writeContinueDismiss(username: string, map: Record<string, boolean>) {
  setStorageItem(userKey(CONFIG.CONTINUE_DISMISS_KEY, username), map);
}

function collectLocalPayload(username: string): CloudSyncPayload {
  return {
    progress: getStorageItem<Record<string, ProgressRecord>>(userKey(CONFIG.STORAGE_KEY, username), {}),
    planCache: getStorageItem<PlanCache | null>(userKey(CONFIG.PLAN_CACHE_KEY, username), null),
    continueDismiss: readContinueDismiss(username),
    syncedAt: Date.now()
  };
}

function applyPayloadToLocal(username: string, payload: CloudSyncPayload) {
  setStorageItem(userKey(CONFIG.STORAGE_KEY, username), payload.progress || {});
  if (payload.planCache) {
    setStorageItem(userKey(CONFIG.PLAN_CACHE_KEY, username), payload.planCache);
  } else if (typeof window !== 'undefined') {
    localStorage.removeItem(userKey(CONFIG.PLAN_CACHE_KEY, username));
  }
  writeContinueDismiss(username, payload.continueDismiss || {});
}

function mergeProgressRecord(local: ProgressRecord, remote: ProgressRecord): ProgressRecord {
  const localTs = local.updatedAt || 0;
  const remoteTs = remote.updatedAt || 0;
  const newer = localTs >= remoteTs ? local : remote;
  const older = newer === local ? remote : local;

  const localSnap = normalizePlanDays(local.planSnapshot?.plan).length ? local.planSnapshot : null;
  const remoteSnap = normalizePlanDays(remote.planSnapshot?.plan).length ? remote.planSnapshot : null;
  const planSnapshot = localSnap || remoteSnap || newer.planSnapshot || older.planSnapshot;

  const completedDays = Array.from(
    new Set([...(newer.completedDays || []), ...(older.completedDays || [])])
  ).sort((a, b) => a - b);

  return {
    ...newer,
    title: newer.title || older.title,
    cover: newer.cover || older.cover,
    dailyMin: newer.dailyMin ?? older.dailyMin,
    planSnapshot,
    completedDays,
    updatedAt: Math.max(localTs, remoteTs)
  };
}

function mergeProgress(
  local: Record<string, ProgressRecord>,
  remote: Record<string, ProgressRecord>
): Record<string, ProgressRecord> {
  const merged: Record<string, ProgressRecord> = { ...remote };
  for (const [bvid, localRec] of Object.entries(local)) {
    const remoteRec = merged[bvid];
    if (!remoteRec) {
      merged[bvid] = localRec;
    } else {
      merged[bvid] = mergeProgressRecord(localRec, remoteRec);
    }
  }
  return merged;
}

function mergeContinueDismiss(
  local: Record<string, boolean>,
  remote: Record<string, boolean>
): Record<string, boolean> {
  return { ...remote, ...local };
}

function mergePlanCache(local: PlanCache | null, remote: PlanCache | null): PlanCache | null {
  if (!local) return remote;
  if (!remote) return local;
  const localTs = new Date(local.generatedAt + 'T00:00:00').getTime() || 0;
  const remoteTs = new Date(remote.generatedAt + 'T00:00:00').getTime() || 0;
  return localTs >= remoteTs ? local : remote;
}

async function fetchCloudPayload(token: string): Promise<CloudSyncPayload | null> {
  const res = await fetch('/api/sync', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '拉取云端数据失败');
  }
  return json.data as CloudSyncPayload;
}

async function pushCloudPayload(token: string, payload: CloudSyncPayload) {
  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '上传云端失败');
  }
}

export async function pullAndMergeCloudSync(username: string, token: string) {
  const local = collectLocalPayload(username);
  const remote = await fetchCloudPayload(token);
  if (!remote) return;

  const merged: CloudSyncPayload = {
    progress: mergeProgress(local.progress, remote.progress || {}),
    planCache: mergePlanCache(local.planCache, remote.planCache),
    continueDismiss: mergeContinueDismiss(local.continueDismiss, remote.continueDismiss || {}),
    syncedAt: Date.now()
  };

  applyPayloadToLocal(username, merged);
  await pushCloudPayload(token, merged);
}

export function scheduleCloudPush() {
  if (!isCloudSyncActive() || !syncUsername || !syncToken) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (!syncUsername || !syncToken || pushing) return;
    pushing = true;
    try {
      const payload = collectLocalPayload(syncUsername);
      await pushCloudPayload(syncToken, payload);
    } catch {
      /* 静默失败，避免打断用户操作 */
    } finally {
      pushing = false;
    }
  }, 800);
}

export async function deleteCloudCourse(bvid: string) {
  if (!isCloudSyncActive() || !syncToken) return;
  const res = await fetch(`/api/sync?bvid=${encodeURIComponent(bvid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${syncToken}` }
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '删除云端课程失败');
  }
}
