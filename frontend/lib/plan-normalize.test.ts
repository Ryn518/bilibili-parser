import { describe, expect, it } from 'vitest';
import { normalizePlanDays } from './plan-normalize';
import { normalizeProgressRecord } from './course-restore';
import type { PlanDay, ProgressRecord } from './types';

describe('normalizePlanDays', () => {
  it('returns array as-is', () => {
    const plan: PlanDay[] = [{ day: 1, pList: [], totalSeconds: 100 }];
    expect(normalizePlanDays(plan)).toEqual(plan);
  });

  it('converts object map to array', () => {
    const plan = { '0': { day: 1, pList: [], totalSeconds: 100 } };
    expect(normalizePlanDays(plan)).toHaveLength(1);
    expect(normalizePlanDays(plan)[0].day).toBe(1);
  });
});

describe('normalizeProgressRecord', () => {
  it('fills bvid and normalizes plan on snapshot', () => {
    const rec: ProgressRecord = {
      completedDays: [1],
      planSnapshot: {
        bvid: '',
        title: 'Test',
        totalSeconds: 100,
        pList: [],
        plan: { '0': { day: 1, pList: [], totalSeconds: 100 } },
        dailyMinutes: 45,
        generatedAt: '2026-01-01'
      }
    };
    const next = normalizeProgressRecord(rec, 'BV1test');
    expect(next.planSnapshot?.bvid).toBe('BV1test');
    expect(Array.isArray(next.planSnapshot?.plan)).toBe(true);
    expect(next.planSnapshot?.plan).toHaveLength(1);
  });
});
