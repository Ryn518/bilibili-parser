import { describe, expect, it } from 'vitest';
import { courseFromSections } from './season-course';
import type { Course } from './types';

const course: Course = {
  bvid: 'BV1',
  title: '王道408',
  cover: 'https://example.com/season.jpg',
  totalSeconds: 600,
  currentSectionId: 'os',
  sections: [
    { id: 'ds', title: '数据结构', episodeCount: 1, totalSeconds: 100, cover: 'https://example.com/ds.jpg' },
    { id: 'os', title: '操作系统', episodeCount: 2, totalSeconds: 500, cover: 'https://example.com/os.jpg' }
  ],
  episodes: [
    { index: 0, title: '线性表', duration: 100, sectionId: 'ds' },
    { index: 1, title: '概念', duration: 200, sectionId: 'os' },
    { index: 2, title: '特征', duration: 300, sectionId: 'os' }
  ]
};

describe('courseFromSections', () => {
  it('keeps only the chosen course and uses its name', () => {
    const next = courseFromSections(course, ['os']);
    expect(next.title).toBe('操作系统');
    expect(next.cover).toBe('https://example.com/os.jpg');
    expect(next.bvid).toBe('BV1::os');
    expect(next.episodes.map((episode) => episode.title)).toEqual(['概念', '特征']);
    expect(next.totalSeconds).toBe(500);
    expect(next.sections).toBeUndefined();
  });

  it('prefixes titles when several courses are planned together', () => {
    const next = courseFromSections(course, ['ds', 'os']);
    expect(next.title).toBe('王道408');
    expect(next.cover).toBe('https://example.com/season.jpg');
    expect(next.bvid).toBe('BV1');
    expect(next.episodes.map((episode) => episode.title)).toEqual(['数据结构 · 线性表', '操作系统 · 概念', '操作系统 · 特征']);
  });
});