import { describe, expect, it } from 'vitest';
import { dateKey, formatDayHeading, sameDay } from './date-key';

describe('dateKey', () => {
  it('formats local calendar day', () => {
    expect(dateKey(new Date(2026, 9, 5, 17, 3))).toBe('2026-10-05');
  });

  it('matches iso timestamps on the same local day', () => {
    expect(sameDay('2026-10-05T17:03:00+08:00', '2026-10-05')).toBe(true);
  });
});

describe('formatDayHeading', () => {
  it('includes weekday', () => {
    expect(formatDayHeading('2026-10-05')).toContain('10月5日');
  });
});
