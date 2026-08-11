'use client';

import { CONFIG } from './config';

let currentStorageUser: string | null = null;

/** 由 AuthProvider 在登录/登出/刷新会话时同步当前用户名 */
export function setStorageUser(username: string | null): void {
  const prev = currentStorageUser;
  currentStorageUser = username;
  if (username && username !== prev) {
    migrateLegacyUserData(username);
    migrateGuestSessionToUser();
  }
}

export function getStorageUser(): string | null {
  return currentStorageUser;
}

function scopedKey(base: string): string {
  if (!currentStorageUser) return base;
  return `${base}:${currentStorageUser}`;
}

function scopedKeyForUser(base: string, username: string): string {
  return `${base}:${username}`;
}

export function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

function getSessionStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setSessionStorageItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

/** 登录后将访客 session 数据合并进账号本地存储 */
export function migrateGuestSessionToUser(): void {
  if (!currentStorageUser || typeof window === 'undefined') return;

  const guestPlan = getSessionStorageItem<import('./types').PlanCache | null>(CONFIG.GUEST_PLAN_KEY, null);
  if (guestPlan?.plan?.length) {
    const existing = getStorageItem<import('./types').PlanCache | null>(
      scopedKey(CONFIG.PLAN_CACHE_KEY),
      null
    );
    if (!existing?.plan?.length) {
      setStorageItem(scopedKey(CONFIG.PLAN_CACHE_KEY), guestPlan);
    }
    sessionStorage.removeItem(CONFIG.GUEST_PLAN_KEY);
  }

  const guestProgress = getSessionStorageItem<Record<string, import('./types').ProgressRecord>>(
    CONFIG.GUEST_PROGRESS_KEY,
    {}
  );
  if (Object.keys(guestProgress).length > 0) {
    const userProgress = getStorageItem<Record<string, import('./types').ProgressRecord>>(
      scopedKey(CONFIG.STORAGE_KEY),
      {}
    );
    for (const [bvid, rec] of Object.entries(guestProgress)) {
      if (!userProgress[bvid]) userProgress[bvid] = rec;
    }
    setStorageItem(scopedKey(CONFIG.STORAGE_KEY), userProgress);
    sessionStorage.removeItem(CONFIG.GUEST_PROGRESS_KEY);
  }

  sessionStorage.removeItem(CONFIG.GUEST_DISMISS_KEY);
}

/** 将旧版全局数据一次性迁移到当前账号（仅当该账号尚无数据时） */
export function migrateLegacyUserData(username: string): void {
  if (typeof window === 'undefined' || !username) return;

  const userProgressKey = scopedKeyForUser(CONFIG.STORAGE_KEY, username);
  if (localStorage.getItem(userProgressKey)) return;

  const legacy = getStorageItem<Record<string, import('./types').ProgressRecord>>(CONFIG.STORAGE_KEY, {});
  if (Object.keys(legacy).length > 0) {
    const looksLikeProgress = Object.values(legacy).every(
      (v) => v && typeof v === 'object' && Array.isArray(v.completedDays)
    );
    if (looksLikeProgress) {
      setStorageItem(userProgressKey, legacy);
      removeStorageItem(CONFIG.STORAGE_KEY);
    }
  }

  const userPlanKey = scopedKeyForUser(CONFIG.PLAN_CACHE_KEY, username);
  if (!localStorage.getItem(userPlanKey)) {
    const legacyPlan = getStorageItem<import('./types').PlanCache | null>(CONFIG.PLAN_CACHE_KEY, null);
    if (legacyPlan?.plan?.length) {
      setStorageItem(userPlanKey, legacyPlan);
      removeStorageItem(CONFIG.PLAN_CACHE_KEY);
    }
  }

  const userDismissKey = scopedKeyForUser(CONFIG.CONTINUE_DISMISS_KEY, username);
  if (!localStorage.getItem(userDismissKey)) {
    const legacyDismiss = getStorageItem<Record<string, boolean>>(CONFIG.CONTINUE_DISMISS_KEY, {});
    if (Object.keys(legacyDismiss).length > 0) {
      setStorageItem(userDismissKey, legacyDismiss);
      removeStorageItem(CONFIG.CONTINUE_DISMISS_KEY);
    }
  }
}

export function loadAllProgress(): Record<string, import('./types').ProgressRecord> {
  if (currentStorageUser) {
    return getStorageItem(scopedKey(CONFIG.STORAGE_KEY), {});
  }
  return getSessionStorageItem(CONFIG.GUEST_PROGRESS_KEY, {});
}

export function saveAllProgress(data: Record<string, import('./types').ProgressRecord>): void {
  if (currentStorageUser) {
    setStorageItem(scopedKey(CONFIG.STORAGE_KEY), data);
  } else {
    setSessionStorageItem(CONFIG.GUEST_PROGRESS_KEY, data);
  }
}

export function loadPlanCache(): import('./types').PlanCache | null {
  if (currentStorageUser) {
    return getStorageItem<import('./types').PlanCache | null>(scopedKey(CONFIG.PLAN_CACHE_KEY), null);
  }
  return getSessionStorageItem<import('./types').PlanCache | null>(CONFIG.GUEST_PLAN_KEY, null);
}

export function savePlanCache(cache: import('./types').PlanCache): void {
  if (currentStorageUser) {
    setStorageItem(scopedKey(CONFIG.PLAN_CACHE_KEY), cache);
  } else {
    setSessionStorageItem(CONFIG.GUEST_PLAN_KEY, cache);
  }
}

export function clearPlanCache(): void {
  if (typeof window === 'undefined') return;
  if (currentStorageUser) {
    removeStorageItem(scopedKey(CONFIG.PLAN_CACHE_KEY));
  } else {
    sessionStorage.removeItem(CONFIG.GUEST_PLAN_KEY);
  }
}

export function isPlanCacheExpired(cache: import('./types').PlanCache): boolean {
  if (!cache?.generatedAt) return true;
  const gen = new Date(cache.generatedAt + 'T00:00:00');
  const diff = (Date.now() - gen.getTime()) / 86400000;
  return diff > CONFIG.PLAN_EXPIRE_DAYS;
}

export function isContinueDismissed(bvid: string): boolean {
  if (currentStorageUser) {
    const map = getStorageItem<Record<string, boolean>>(scopedKey(CONFIG.CONTINUE_DISMISS_KEY), {});
    return !!map[bvid];
  }
  const map = getSessionStorageItem<Record<string, boolean>>(CONFIG.GUEST_DISMISS_KEY, {});
  return !!map[bvid];
}

export function dismissContinueBanner(bvid: string): void {
  if (currentStorageUser) {
    const map = getStorageItem<Record<string, boolean>>(scopedKey(CONFIG.CONTINUE_DISMISS_KEY), {});
    map[bvid] = true;
    setStorageItem(scopedKey(CONFIG.CONTINUE_DISMISS_KEY), map);
    return;
  }
  const map = getSessionStorageItem<Record<string, boolean>>(CONFIG.GUEST_DISMISS_KEY, {});
  map[bvid] = true;
  setSessionStorageItem(CONFIG.GUEST_DISMISS_KEY, map);
}

export function activePlanSessionKey(username?: string | null): string {
  const u = username ?? currentStorageUser;
  return u ? `bili-active-plan:${u}` : 'bili-active-plan';
}

export function clearUserSessionPlanKeys(username?: string | null): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(activePlanSessionKey(username));
  sessionStorage.removeItem('bili-restore-cache');
  sessionStorage.removeItem(CONFIG.GUEST_PLAN_KEY);
  sessionStorage.removeItem(CONFIG.GUEST_PROGRESS_KEY);
  sessionStorage.removeItem('bili-active-plan');
}
