import { describe, expect, it } from 'vitest';
import { assertClientLimit, clientKeyFromRequest } from './rate-limit';

describe('assertClientLimit', () => {
  it('allows a burst then blocks the same key', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 12; i++) assertClientLimit(key);
    expect(() => assertClientLimit(key)).toThrow(/过于频繁/);
  });
});

describe('clientKeyFromRequest', () => {
  it('uses the first x-forwarded-for hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });
    expect(clientKeyFromRequest(headers)).toBe('1.1.1.1');
  });
});
