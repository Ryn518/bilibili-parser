import { bvidMatch } from '@/lib/bvid';
import { normalizePlanDays } from '@/lib/plan-normalize';
import { normalizeCover } from '@/lib/format';
import { loadPlanCache, loadAllProgress } from '@/lib/storage';
import type { Episode, PlanCache, PlanDay, ProgressRecord } from '@/lib/types';

/** 按 BV 号查找进度（兼容 key 与快照内 bvid 大小写差异） */
export function findProgressEntry(
  progress: Record<string, ProgressRecord>,
  bvid: string
): [string, ProgressRecord] | null {
  if (progress[bvid]) return [bvid, progress[bvid]];
  for (const [key, rec] of Object.entries(progress)) {
    if (bvidMatch(key, bvid)) return [key, rec];
    const snapBvid = rec.planSnapshot?.bvid;
    if (snapBvid && bvidMatch(snapBvid, bvid)) return [key, rec];
  }
  return null;
}

/** 旧快照可能缺 pList，从 plan 分集信息反推 */
function rebuildPlistFromPlan(plan: PlanDay[]): Episode[] {
  const map = new Map<number, Episode>();
  for (const day of plan) {
    for (const part of day.pList || []) {
      const endAt = part.endAt || part.duration || 0;
      const prev = map.get(part.index);
      if (!prev) {
        map.set(part.index, { index: part.index, title: part.title, duration: endAt });
      } else if (endAt > prev.duration) {
        prev.duration = endAt;
        prev.title = part.title || prev.title;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.index - b.index);
}

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
  const pList =
    cache.pList?.length ? cache.pList : cache.plan?.length ? rebuildPlistFromPlan(cache.plan) : [];
  const totalSeconds =
    cache.totalSeconds && cache.totalSeconds > 0
      ? cache.totalSeconds
      : pList.reduce((s, e) => s + (e.duration || 0), 0);

  const plan = normalizePlanDays(cache.plan);

  return {
    bvid: cache.bvid || bvid,
    title: cache.title || saved?.title || bvid,
    totalSeconds,
    pList,
    plan,
    dailyMinutes: cache.dailyMinutes ?? saved?.dailyMin ?? 45,
    generatedAt: cache.generatedAt || new Date().toISOString().slice(0, 10),
    coverUrl: resolveCourseCover(cache, saved)
  };
}

export function openCourseFromHistory(bvid: string, dailyMin: number): PlanCache | null {
  const all = loadAllProgress();
  const found = findProgressEntry(all, bvid);
  const saved = found?.[1];
  const canonicalBvid = found?.[0] || bvid;

  const snapPlan = saved?.planSnapshot ? normalizePlanDays(saved.planSnapshot.plan) : [];
  if (snapPlan.length) {
    return enrichPlanCache(
      {
        ...saved!.planSnapshot!,
        plan: snapPlan,
        dailyMinutes: saved!.planSnapshot!.dailyMinutes ?? dailyMin
      },
      canonicalBvid,
      saved
    );
  }

  const cache = loadPlanCache();
  if (cache && bvidMatch(cache.bvid, bvid) && normalizePlanDays(cache.plan).length) {
    return enrichPlanCache({ ...cache, dailyMinutes: cache.dailyMinutes ?? dailyMin }, canonicalBvid, saved);
  }

  return null;
}
