import { describe, expect, it } from 'vitest';
import { episodesFromSeason, readSeason } from './bilibili-proxy';

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

  it('treats each multi-part video in one season as its own course', () => {
    const outline = readSeason(
      {
        title: '王道考研408公益课程',
        sections: [
          {
            id: 1,
            title: '正片',
            episodes: [
              {
                title: '王道计算机考研 数据结构',
                bvid: 'BV1ds',
                pages: [
                  { part: '线性表', duration: 100 },
                  { part: '树', duration: 200 }
                ]
              },
              {
                title: '王道计算机考研 操作系统',
                bvid: 'BV1os',
                arc: { pic: 'http://example.com/os.jpg' },
                pages: [
                  { part: '概念', duration: 300 },
                  { part: '特征', duration: 400 }
                ]
              }
            ]
          }
        ]
      },
      'BV1os'
    );
    expect(outline?.sections.map((section) => section.title)).toEqual(['王道计算机考研 数据结构', '王道计算机考研 操作系统']);
    expect(outline?.currentSectionId).toBe('BV1os');
    expect(outline?.sections.find((section) => section.id === 'BV1os')?.cover).toBe('https://example.com/os.jpg');
    expect(outline?.episodes.filter((episode) => episode.sectionId === 'BV1os').map((episode) => episode.title)).toEqual([
      '概念',
      '特征'
    ]);
  });

  it('keeps sections separate and marks the video the user pasted', () => {
    const outline = readSeason(
      {
        title: '王道408',
        sections: [
          { id: 1, title: '数据结构', episodes: [{ title: '线性表', bvid: 'BV1data', arc: { duration: 100 } }] },
          {
            id: 2,
            title: '操作系统',
            episodes: [
              { title: '概念', bvid: 'BV1os', arc: { duration: 200 } },
              { title: '特征', bvid: 'BV1os2', arc: { duration: 300 } }
            ]
          }
        ]
      },
      'BV1os'
    );
    expect(outline?.sections.map((section) => section.title)).toEqual(['数据结构', '操作系统']);
    expect(outline?.currentSectionId).toBe('2');
    expect(outline?.episodes.map((episode) => episode.title)).toEqual(['线性表', '概念', '特征']);
  });
});
