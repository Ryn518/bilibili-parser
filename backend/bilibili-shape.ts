/**
 * 只用浏览器已经拿到的公开视频原文整理课表。这里不请求 B 站。
 */
import type { Course, Episode } from '@/lib/types';
import { readSeason } from './bilibili-proxy';

function normalizeCover(url: string) {
  if (!url) return '';
  let u = String(url).trim().replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = `https:${u}`;
  return u.replace(/^http:\/\//i, 'https://').replace(/@\d+w_\d+h[^/?#]*$/i, '');
}

function asPages(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw as Record<string, unknown>[];
}

function buildCourse(viewData: Record<string, unknown>, pages: Record<string, unknown>[], bvid: string): Course {
  const episodes: Episode[] = pages.map((page, index) => ({
    index,
    title: String(page.part || page.title || `P${index + 1}`),
    duration: Number(page.duration) || 0
  }));

  return {
    bvid: String(viewData.bvid || bvid),
    title: String(viewData.title || bvid),
    cover: normalizeCover(String(viewData.pic || '')),
    totalSeconds: episodes.reduce((sum, episode) => sum + episode.duration, 0),
    episodes
  };
}

/** 整理不了时返回 null。 */
export function shapeCourseFromView(viewData: Record<string, unknown>, bvid: string): Course | null {
  const pages = asPages(viewData.pages);
  const cid = Number(viewData.cid);
  const season = readSeason(viewData.ugc_season, bvid, Number.isFinite(cid) ? cid : undefined);
  if (season) {
    const course = buildCourse(
      {
        ...viewData,
        title: season.title || viewData.title,
        pic: season.cover || viewData.pic
      },
      season.episodes.map((part) => ({ part: part.title, duration: part.duration })),
      bvid
    );
    if (season.sections.length > 1) {
      course.sections = season.sections;
      course.currentSectionId = season.currentSectionId;
      course.episodes = course.episodes.map((episode, index) => ({
        ...episode,
        sectionId: season.episodes[index]?.sectionId
      }));
    }
    return course;
  }
  if (!pages.length) return null;
  return buildCourse(viewData, pages, bvid);
}
