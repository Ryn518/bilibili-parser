import { fetchCourse } from '@/lib/bilibili-client';
import { generatePlan } from '@/lib/planner';
import { findProgressEntry, openCourseFromHistory } from '@/components/plan/plan-utils';
import { pullAndMergeCloudSync } from '@/lib/cloud-sync';
import { normalizePlanDays } from '@/lib/plan-normalize';
import { loadAllProgress, setStorageUser } from '@/lib/storage';
import type { Course, PlanCache, PlanDay, ProgressRecord } from '@/lib/types';

/** 规范化进度里的 planSnapshot（兼容旧版/云端结构） */
export function normalizeProgressRecord(rec: ProgressRecord, bvid: string): ProgressRecord {
  const snap = rec.planSnapshot;
  if (!snap) return rec;
  const plan = normalizePlanDays(snap.plan);
  if (!plan.length) return rec;
  return {
    ...rec,
    planSnapshot: {
      ...snap,
      bvid: snap.bvid || bvid,
      plan,
      dailyMinutes: snap.dailyMinutes ?? rec.dailyMin ?? 45,
      generatedAt: snap.generatedAt || new Date().toISOString().slice(0, 10)
    }
  };
}

export function getCourseOpenContext(bvid: string, username: string | null) {
  if (username) setStorageUser(username);
  const all = loadAllProgress();
  const found = findProgressEntry(all, bvid);
  const canonicalBvid = found?.[0] || bvid;
  const saved = found?.[1] ? normalizeProgressRecord(found[1], canonicalBvid) : undefined;
  const dailyMin = saved?.dailyMin || saved?.planSnapshot?.dailyMinutes || 45;
  return { canonicalBvid, saved, dailyMin, all };
}

export interface RestoreCourseOptions {
  bvid: string;
  username: string | null;
  token?: string | null;
  userId?: string | null;
  restoreFromCache: (cache: PlanCache, opts?: { ignoreExpiry?: boolean }) => boolean;
  renderFromApi: (course: Course, plan: PlanDay[], dailyMin: number, completedDays?: number[]) => void;
}

/**
 * 从「我的课程」打开：优先本地快照，失败则拉云端再试，仍失败则从 B 站 API 重建课表（保留打卡进度）
 */
export async function restoreCourseForMine(opts: RestoreCourseOptions): Promise<boolean> {
  const { bvid, username, token, userId, restoreFromCache, renderFromApi } = opts;

  const trySnapshot = (): boolean => {
    const ctx = getCourseOpenContext(bvid, username);
    const cache = openCourseFromHistory(ctx.canonicalBvid, ctx.dailyMin);
    if (cache?.plan?.length && restoreFromCache(cache, { ignoreExpiry: true })) {
      return true;
    }
    return false;
  };

  if (trySnapshot()) return true;

  if (userId && token && username) {
    try {
      await pullAndMergeCloudSync(username, token);
    } catch {
      /* 云端拉取失败仍尝试 API 重建 */
    }
    if (trySnapshot()) return true;
  }

  const ctx = getCourseOpenContext(bvid, username);
  const completedDays = ctx.saved?.completedDays || [];
  const dailyMin = ctx.dailyMin;

  try {
    const url = `https://www.bilibili.com/video/${ctx.canonicalBvid}`;
    const courseData = await fetchCourse(url);
    const planData = generatePlan(courseData.episodes, dailyMin);
    if (!planData.length) return false;
    const validDays = new Set(planData.map((d) => d.day));
    const keptCompleted = completedDays.filter((d) => validDays.has(d));
    renderFromApi(courseData, planData, dailyMin, keptCompleted);
    return true;
  } catch {
    return false;
  }
}
