import { describe, expect, it } from 'vitest';
import { generatePlan } from './planner';
import type { Episode } from './types';

const sampleEpisodes: Episode[] = [
  { index: 0, title: '第1集', duration: 1200 },
  { index: 1, title: '第2集', duration: 1800 },
  { index: 2, title: '第3集', duration: 900 }
];

describe('generatePlan', () => {
  it('creates at least one day for valid episodes', () => {
    const plan = generatePlan(sampleEpisodes, 45);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].day).toBe(1);
  });

  it('respects daily minute budget approximately', () => {
    const plan = generatePlan(sampleEpisodes, 30);
    for (const day of plan) {
      expect(day.totalSec).toBeLessThanOrEqual(30 * 60 + Math.floor(30 * 60 * 0.15) + 60);
    }
  });

  it('covers all episodes across days', () => {
    const plan = generatePlan(sampleEpisodes, 20);
    const covered = new Set<number>();
    for (const day of plan) {
      for (const part of day.pList) covered.add(part.index);
    }
    expect(covered.size).toBe(sampleEpisodes.length);
  });
});
