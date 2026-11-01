import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import { listPlazaInbox } from './plaza-service';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn()
  }
}));

describe('listPlazaInbox', () => {
  afterEach(() => {
    vi.mocked(fs.readFileSync).mockReset();
  });

  it('lists likes and comments on my posts, skipping my own', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([
        {
          id: 'p1',
          content: '广场第一帖',
          username: 'Ryn同学',
          authorKey: 'u:Ryn同学',
          createdAt: '2026-10-05T00:00:00.000Z',
          likes: ['u:Ryn同学', 'u:少花'],
          likeAt: { 'u:少花': '2026-10-12T12:00:00.000Z' },
          comments: [
            {
              id: 'c1',
              content: '好用',
              username: 'serendipity',
              createdAt: '2026-10-10T11:39:00.000Z',
              likes: ['u:别人'],
              likeAt: { 'u:别人': '2026-10-11T00:00:00.000Z' }
            }
          ]
        }
      ])
    );

    const items = listPlazaInbox('Ryn同学');
    expect(items.some((item) => item.kind === 'like' && item.from === '少花')).toBe(true);
    expect(items.some((item) => item.kind === 'comment' && item.from === 'serendipity')).toBe(true);
    expect(items.some((item) => item.from === 'Ryn同学')).toBe(false);
  });
});
