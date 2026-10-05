import { describe, expect, it } from 'vitest';
import { episodesFromSeason } from './bilibili-proxy';

describe('episodesFromSeason', () => {
  it('returns nothing when the video is not in a collection', () => {
    expect(episodesFromSeason(undefined)).toEqual([]);
    expect(episodesFromSeason({ sections: [{ title: '正片', episodes: [{ title: '只有一条', arc: { duration: 10 } }] }] })).toEqual([]);
  });

  it('lists every video in a single-section collection', () => {
    const parts = episodesFromSeason({
      title: '设计模式',
      sections: [
        {
          title: '正片',
          episodes: [
            { title: '01.单例', arc: { duration: 300 }, page: { duration: 300 } },
            { title: '02.工厂', arc: { duration: 400 } }
          ]
        }
      ]
    });
    expect(parts).toEqual([
      { title: '01.单例', duration: 300 },
      { title: '02.工厂', duration: 400 }
    ]);
  });

  it('keeps section names when a collection has several sections', () => {
    const parts = episodesFromSeason({
      sections: [
        { title: '基础', episodes: [{ title: '开篇', arc: { duration: 60 } }] },
        { title: '进阶', episodes: [{ title: '收尾', arc: { duration: 90 } }] }
      ]
    });
    expect(parts.map((part) => part.title)).toEqual(['基础 · 开篇', '进阶 · 收尾']);
  });

  it('expands a collection video that itself has multiple parts', () => {
    const parts = episodesFromSeason({
      sections: [
        {
          episodes: [
            { title: '第一讲', pages: [{ part: '上', duration: 10 }, { part: '下', duration: 20 }] },
            { title: '第二讲', arc: { duration: 30 } }
          ]
        }
      ]
    });
    expect(parts).toEqual([
      { title: '上', duration: 10 },
      { title: '下', duration: 20 },
      { title: '第二讲', duration: 30 }
    ]);
  });
});
