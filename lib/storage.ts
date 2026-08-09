'use client';

import { CONFIG } from './config';

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

export function loadAllProgress(): Record<string, import('./types').ProgressRecord> {
  return getStorageItem(CONFIG.STORAGE_KEY, {});
}

export function saveAllProgress(data: Record<string, import('./types').ProgressRecord>): void {
  setStorageItem(CONFIG.STORAGE_KEY, data);
}

export function loadPlanCache(): import('./types').PlanCache | null {
  return getStorageItem<import('./types').PlanCache | null>(CONFIG.PLAN_CACHE_KEY, null);
}

export function savePlanCache(cache: import('./types').PlanCache): void {
  setStorageItem(CONFIG.PLAN_CACHE_KEY, cache);
}

export function isPlanCacheExpired(cache: import('./types').PlanCache): boolean {
  if (!cache?.generatedAt) return true;
  const gen = new Date(cache.generatedAt + 'T00:00:00');
  const diff = (Date.now() - gen.getTime()) / 86400000;
  return diff > CONFIG.PLAN_EXPIRE_DAYS;
}

export function isContinueDismissed(bvid: string): boolean {
  const map = getStorageItem<Record<string, boolean>>(CONFIG.CONTINUE_DISMISS_KEY, {});
  return !!map[bvid];
}

export function dismissContinueBanner(bvid: string): void {
  const map = getStorageItem<Record<string, boolean>>(CONFIG.CONTINUE_DISMISS_KEY, {});
  map[bvid] = true;
  setStorageItem(CONFIG.CONTINUE_DISMISS_KEY, map);
}
