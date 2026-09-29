import { describe, expect, it } from 'vitest';
import { normalizeBvid, parsePasteInput } from './bvid';

describe('bvid case sensitivity', () => {
  it('preserves mixed-case BV body', () => {
    expect(normalizeBvid('BV1Fry9BcE8q')).toBe('BV1Fry9BcE8q');
    expect(normalizeBvid('bv1Fry9BcE8q')).toBe('BV1Fry9BcE8q');
  });

  it('does not uppercase the entire id', () => {
    expect(normalizeBvid('BV1Fry9BcE8q')).not.toBe('BV1FRY9BCE8Q');
  });

  it('extracts case-correct BV from share text', () => {
    const raw =
      '【《考研数学》速成课 | 框框老师】 https://www.bilibili.com/video/BV1Fry9BcE8q/?spm_id_from=333';
    const { videoId } = parsePasteInput(raw);
    expect(videoId).toBe('BV1Fry9BcE8q');
  });
});
