import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PlanCache, ProgressRecord } from './types';

vi.mock('./bilibili-client', () => ({
  fetchCourse: vi.fn(async () => ({
    bvid: 'BV1test',
    title: 'Test Course',
    cover: '',
    totalSeconds: 3600,
    episodes: [{ index: 1, title: 'P1', duration: 3600 }]
  }))
}));

vi.mock('./planner', () => ({
  generatePlan: vi.fn(() => [{ day: 1, pList: [{ index: 1, title: 'P1', duration: 3600, endAt: 3600 }], totalSeconds: 3600 }])
}));

vi.mock('./cloud-sync', () => ({
  pullAndMergeCloudSync: vi.fn(async () => {})
}));

const progressStore: Record<string, ProgressRecord> = {};
let storageUser: string | null = null;

vi.mock('./storage', () => ({
  setStorageUser: (u: string | null) => {
    storageUser = u;
  },
  loadAllProgress: () => progressStore,
  loadPlanCache: () => null
}));

import { restoreCourseForMine } from './course-restore';

describe('restoreCourseForMine', () => {
  beforeEach(() => {
    storageUser = null;
    for (const k of Object.keys(progressStore)) delete progressStore[k];
  });

  it('opens course from snapshot after setStorageUser', async () => {
    progressStore['BV1test'] = {
      completedDays: [1],
      dailyMin: 45,
      planSnapshot: {
        bvid: 'BV1test',
        title: 'Old Course',
        totalSeconds: 3600,
        pList: [{ index: 1, title: 'P1', duration: 3600 }],
        plan: [{ day: 1, pList: [{ index: 1, title: 'P1', duration: 3600, endAt: 3600 }], totalSeconds: 3600 }],
        dailyMinutes: 45,
        generatedAt: '2025-01-01'
      }
    };

    let restored: PlanCache | null = null;
    const ok = await restoreCourseForMine({
      bvid: 'BV1test',
      username: 'fzh',
      restoreFromCache: (cache) => {
        restored = cache;
        return true;
      },
      renderFromApi: () => {}
    });

    expect(ok).toBe(true);
    expect(restored?.bvid).toBe('BV1test');
    expect(storageUser).toBe('fzh');
  });

  it('falls back to API when snapshot missing but keeps completedDays', async () => {
    progressStore['BV1test'] = {
      completedDays: [1],
      dailyMin: 30
    };

    let completed: number[] | undefined;
    const ok = await restoreCourseForMine({
      bvid: 'BV1test',
      username: 'fzh',
      restoreFromCache: () => false,
      renderFromApi: (_c, _p, _d, days) => {
        completed = days;
      }
    });

    expect(ok).toBe(true);
    expect(completed).toEqual([1]);
  });
});
