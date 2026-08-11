import { bvidMatch } from '@/lib/bvid';
import { normalizeCover } from '@/lib/format';
import { loadPlanCache, loadAllProgress } from '@/lib/storage';
import type { PlanCache, ProgressRecord } from '@/lib/types';

/** 兼容 v1 快照字段 cover 与 v2 的 coverUrl */
export function resolveCourseCover(
  snap?: { coverUrl?: string; cover?: string } | null,
  saved?: Pick<ProgressRecord, 'cover'> | null
): string {
  return normalizeCover(snap?.coverUrl || snap?.cover || saved?.cover || '');
}

function enrichPlanCache(
  cache: Partial<PlanCache> & { cover?: string; plan: PlanCache['plan'] },
  bvid: string,
  saved?: ProgressRecord
): PlanCache {
  return {
    bvid: cache.bvid || bvid,
    title: cache.title || saved?.title || bvid,
    totalSeconds: cache.totalSeconds ?? 0,
    pList: cache.pList || [],
    plan: cache.plan,
    dailyMinutes: cache.dailyMinutes ?? saved?.dailyMin ?? 45,
    generatedAt: cache.generatedAt || new Date().toISOString().slice(0, 10),
    coverUrl: resolveCourseCover(cache, saved)
  };
}

export function openCourseFromHistory(bvid: string, _dailyMin: number): PlanCache | null {
  const saved = loadAllProgress()[bvid];

  // 与旧版一致：「我的课程」优先用进度里的快照（最可靠）
  if (saved?.planSnapshot?.plan?.length) {
    return enrichPlanCache(saved.planSnapshot as PlanCache & { cover?: string }, bvid, saved);
  }

  const cache = loadPlanCache();
  if (cache && bvidMatch(cache.bvid, bvid) && cache.plan.length) {
    return enrichPlanCache(cache, bvid, saved);
  }

  return null;
}
