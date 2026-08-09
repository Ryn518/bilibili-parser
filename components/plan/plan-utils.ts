import { bvidMatch } from '@/lib/bvid';
import { loadPlanCache, loadAllProgress } from '@/lib/storage';
import type { PlanCache } from '@/lib/types';

export function openCourseFromHistory(bvid: string, _dailyMin: number): PlanCache | null {
  const cache = loadPlanCache();
  if (cache && bvidMatch(cache.bvid, bvid) && cache.plan.length) {
    return cache;
  }
  const saved = loadAllProgress()[bvid];
  if (saved?.planSnapshot?.plan?.length) return saved.planSnapshot;
  return null;
}
