import { describe, expect, it } from 'vitest';
import { shapeCourseFromView } from './bilibili-shape';

describe('shapeCourseFromView', () => {
  it('builds episodes from a view payload without calling Bilibili', () => {
    const course = shapeCourseFromView(
      {
        bvid: 'BV1shape0001',
        title: '整理课',
        pic: 'http://i0.hdslb.com/a.jpg',
        pages: [
          { part: '甲', duration: 5 },
          { part: '乙', duration: 7 }
        ]
      },
      'BV1shape0001'
    );
    expect(course).toMatchObject({
      bvid: 'BV1shape0001',
      title: '整理课',
      cover: 'https://i0.hdslb.com/a.jpg',
      totalSeconds: 12
    });
    expect(course?.episodes.map((episode) => episode.title)).toEqual(['甲', '乙']);
  });

  it('returns null when the payload has no parts', () => {
    expect(shapeCourseFromView({ bvid: 'BV1shape0001', title: '空' }, 'BV1shape0001')).toBeNull();
  });
});
