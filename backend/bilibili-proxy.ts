/**
 * B 站课程数据代理 — 借鉴 yt-dlp 的多端点策略，针对「规划器」场景做速度优化：
 * 1. 快路径：只打一次 view（自带 title / pic / pages）
 * 2. 缺分P 时再顺序尝试 pagelist（避免并行打接口）
 * 3. 不在热路径走 allorigins 等慢代理
 * 4. 进程内短 TTL 缓存，重复规划秒回
 * 5. 缓存未命中才限流：按访问者 + 全站间隔打 B 站
 */
import type { Course, Episode } from '@/lib/types';
import { assertClientLimit, noteBiliBusy, withBiliSlot } from './rate-limit';

const CACHE_TTL_MS = 30 * 60 * 1000;
const courseCache = new Map<string, { data: Course; ts: number }>();

function buildHeaders(bvid?: string | null) {
  const referer = bvid
    ? `https://www.bilibili.com/video/${bvid}`
    : 'https://www.bilibili.com/';
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Referer: referer,
    Origin: 'https://www.bilibili.com',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
  };
}

function friendlyBiliError(code: number, message?: string): string {
  if (code === -404 || /啥都木有|稿件不存在|不存在/i.test(message || '')) {
    return '该视频不存在、已下架或无法访问，请确认链接完整有效';
  }
  if (code === -403 || /权限|登录|地区/i.test(message || '')) {
    return '该视频无访问权限（可能是充电/大会员/地区限制）';
  }
  return message || `B站返回错误 code=${code}`;
}

function isBusyStatus(status: number) {
  return status === 412 || status === 429 || status === 503;
}

/** 直连 B 站（热路径）；超时压到 8s，失败即抛，不拖慢 */
async function fetchBiliJson(url: string, bvid?: string | null, timeoutMs = 8000) {
  return withBiliSlot(async () => {
    const response = await fetch(url, {
      headers: buildHeaders(bvid),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store'
    });
    if (isBusyStatus(response.status)) {
      noteBiliBusy();
      throw Object.assign(new Error('B站接口繁忙，请稍后再试'), { status: 429 });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(friendlyBiliError(Number(data.code), data.message));
    }
    return data as { code: number; message?: string; data: unknown };
  });
}

/** 缺分P 时按顺序试备选端点，成功一个就停 */
async function firstJson(urls: string[], bvid: string, timeoutMs = 8000) {
  const errors: string[] = [];
  for (const url of urls) {
    try {
      return await fetchBiliJson(url, bvid, timeoutMs);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  throw new Error(errors[0] || '全部端点失败');
}

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

interface SeasonEpisode {
  title?: string;
  bvid?: string;
  cid?: number;
  page?: { cid?: number; part?: string; duration?: number };
  pages?: { cid?: number; part?: string; duration?: number }[];
  arc?: { title?: string; duration?: number; bvid?: string };
}

interface SeasonSection {
  id?: number | string;
  title?: string;
  episodes?: SeasonEpisode[];
}

export interface SeasonOutlineEpisode {
  title: string;
  duration: number;
  sectionId: string;
  sectionTitle: string;
  bvid?: string;
}

export interface SeasonOutline {
  title: string;
  cover: string;
  sections: { id: string; title: string; episodeCount: number; totalSeconds: number }[];
  episodes: SeasonOutlineEpisode[];
  currentSectionId?: string;
}

function episodeBvid(episode: SeasonEpisode): string {
  return String(episode.bvid || episode.arc?.bvid || '').trim();
}

function episodeCids(episode: SeasonEpisode): number[] {
  return [episode.cid, episode.page?.cid, ...(episode.pages || []).map((page) => page.cid)]
    .map((cid) => Number(cid))
    .filter((cid) => Number.isFinite(cid) && cid > 0);
}

function expandEpisode(episode: SeasonEpisode): { title: string; duration: number }[] {
  const pages = Array.isArray(episode.pages) && episode.pages.length ? episode.pages : [];
  const baseTitle = String(episode.title || episode.arc?.title || episode.page?.part || '').trim();
  if (pages.length > 1) {
    return pages.map((page, index) => ({
      title: String(page.part || '').trim() || baseTitle || `P${index + 1}`,
      duration: Number(page.duration) || 0
    }));
  }
  if (!baseTitle) return [];
  return [
    {
      title: baseTitle,
      duration: Number(episode.arc?.duration || episode.page?.duration || pages[0]?.duration) || 0
    }
  ];
}

/**
 * 把合集拆开。
 * 像 408 这种：一节「正片」里挂着多门课，每门课自己又有很多分 P，按每一门课拆。
 * 普通合集：每一集就是一讲，仍合成一门课。只有一条视频时返回 null，交给分 P 逻辑。
 */
export function readSeason(season: unknown, currentBvid?: string, currentCid?: number): SeasonOutline | null {
  if (!season || typeof season !== 'object') return null;
  const raw = season as { title?: string; cover?: string; sections?: SeasonSection[] };
  const sections = raw.sections;
  if (!Array.isArray(sections) || !sections.length) return null;

  const rows: { episode: SeasonEpisode; sectionId: string; sectionTitle: string }[] = [];
  sections.forEach((section, index) => {
    const sectionId = String(section.id ?? index);
    const sectionTitle = String(section.title || '').trim() || `合集 ${index + 1}`;
    for (const episode of section.episodes || []) rows.push({ episode, sectionId, sectionTitle });
  });

  const courseBundle = rows.filter((row) => (row.episode.pages || []).length > 1).length >= 2;
  const want = currentBvid?.trim().toLowerCase();
  const episodes: SeasonOutlineEpisode[] = [];
  const outlineSections: SeasonOutline['sections'] = [];
  let currentSectionId: string | undefined;

  rows.forEach((row, index) => {
    const parts = expandEpisode(row.episode);
    if (!parts.length) return;
    const bvid = episodeBvid(row.episode);
    const episodeTitle = String(row.episode.title || row.episode.arc?.title || '').trim();
    const groupId = courseBundle ? bvid || String(row.episode.cid || index) : row.sectionId;
    const groupTitle = courseBundle ? episodeTitle || row.sectionTitle : row.sectionTitle;
    const hit =
      (want && bvid && bvid.toLowerCase() === want) ||
      (currentCid != null && episodeCids(row.episode).includes(currentCid));
    if (hit) currentSectionId = groupId;

    const before = episodes.length;
    for (const part of parts) {
      episodes.push({
        title: part.title,
        duration: part.duration,
        sectionId: groupId,
        sectionTitle: groupTitle,
        bvid: bvid || undefined
      });
    }
    if (!courseBundle) return;
    const slice = episodes.slice(before);
    const existing = outlineSections.find((section) => section.id === groupId);
    if (existing) {
      existing.episodeCount += slice.length;
      existing.totalSeconds += slice.reduce((sum, episode) => sum + episode.duration, 0);
      return;
    }
    outlineSections.push({
      id: groupId,
      title: groupTitle,
      episodeCount: slice.length,
      totalSeconds: slice.reduce((sum, episode) => sum + episode.duration, 0)
    });
  });

  if (!courseBundle) {
    const bySection = new Map<string, SeasonOutlineEpisode[]>();
    for (const episode of episodes) {
      const list = bySection.get(episode.sectionId) || [];
      list.push(episode);
      bySection.set(episode.sectionId, list);
    }
    for (const [id, list] of bySection) {
      outlineSections.push({
        id,
        title: list[0]?.sectionTitle || id,
        episodeCount: list.length,
        totalSeconds: list.reduce((sum, episode) => sum + episode.duration, 0)
      });
    }
  }

  if (episodes.length <= 1 || !outlineSections.length) return null;
  return {
    title: String(raw.title || '').trim(),
    cover: String(raw.cover || '').trim(),
    sections: outlineSections,
    episodes,
    currentSectionId
  };
}

/** 合集（ugc_season）展开成课程分集。只有一条视频时返回空，交给分 P 逻辑。 */
export function episodesFromSeason(season: unknown): { title: string; duration: number }[] {
  const outline = readSeason(season);
  if (!outline) return [];
  const multi = outline.sections.length > 1;
  return outline.episodes.map((episode) => ({
    title: multi && episode.sectionTitle ? `${episode.sectionTitle} · ${episode.title}` : episode.title,
    duration: episode.duration
  }));
}

function buildCourse(viewData: Record<string, unknown>, pages: Record<string, unknown>[], bvid: string): Course {
  const episodes: Episode[] = pages.map((p, i) => ({
    index: i,
    title: String(p.part || p.title || `P${i + 1}`),
    duration: Number(p.duration) || 0
  }));

  return {
    bvid: String(viewData.bvid || bvid),
    title: String(viewData.title || bvid),
    cover: normalizeCover(String(viewData.pic || '')),
    totalSeconds: episodes.reduce((s, e) => s + e.duration, 0),
    episodes
  };
}

function cacheKey(bvid: string) {
  return `bundle:${bvid}`;
}

function getCached(bvid: string): Course | null {
  const hit = courseCache.get(cacheKey(bvid));
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    courseCache.delete(cacheKey(bvid));
    return null;
  }
  return hit.data;
}

function setCached(bvid: string, data: Course) {
  courseCache.set(cacheKey(bvid), { data, ts: Date.now() });
}

/**
 * 快路径（yt-dlp / 旧版最优路径）：
 * view 一次拿齐元数据 + 分P；只有 pages 缺失才竞速 pagelist。
 */
export async function handleCourse(bvid: string, clientKey?: string): Promise<Course> {
  const cached = getCached(bvid);
  if (cached) return cached;
  if (clientKey) assertClientLimit(clientKey);

  const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

  let viewData: Record<string, unknown> | null = null;
  let pages: Record<string, unknown>[] = [];
  let viewErr: Error | undefined;

  try {
    const view = await fetchBiliJson(viewUrl, bvid, 8000);
    viewData = view.data as Record<string, unknown>;
    pages = asPages(viewData?.pages);
  } catch (e) {
    viewErr = e as Error;
  }

  // 合集：同一个课程下有多条独立视频，view 里的 pages 只有当前这一条
  if (viewData) {
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
      setCached(bvid, course);
      return course;
    }
  }

  // 分 P：pages 已够用 → 立即返回（通常 1 次 RTT）
  if (pages.length && viewData) {
    const course = buildCourse(viewData, pages, bvid);
    setCached(bvid, course);
    return course;
  }

  // 降级：竞速 yt-dlp 常用的两个 pagelist 端点
  const pageUrls = [
    `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp`,
    `https://api.bilibili.com/x/web-interface/pagelist?bvid=${encodeURIComponent(bvid)}`
  ];

  try {
    const paged = await firstJson(pageUrls, bvid, 8000);
    pages = asPages(paged.data);
  } catch (e) {
    if (!pages.length) {
      throw new Error(viewErr?.message || (e as Error).message || '未找到分P信息');
    }
  }

  if (!pages.length) {
    throw new Error(viewErr?.message || '未找到分P信息');
  }

  if (!viewData) {
    // view 失败时至少用分P 拼出可用课表
    viewData = { bvid, title: pages[0]?.part || bvid, pic: '' };
  }

  const course = buildCourse(viewData, pages, bvid);
  setCached(bvid, course);
  return course;
}

export async function resolveShortUrl(rawUrl: string, clientKey?: string): Promise<string> {
  const url = rawUrl.trim();
  if (!url) throw new Error('缺少 url 参数');
  if (clientKey) assertClientLimit(clientKey);

  const response = await withBiliSlot(() =>
    fetch(url, {
      headers: buildHeaders(null),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    })
  );

  // BV 大小写敏感，禁止 toUpperCase 整串
  const fromFinal = response.url.match(/BV1[a-zA-Z0-9]{9}/i);
  if (fromFinal) {
    const m = fromFinal[0].match(/^(BV)(1[a-zA-Z0-9]{9})$/i)!;
    return `BV${m[2]}`;
  }

  const html = await response.text();
  const fromHtml = html.match(/BV1[a-zA-Z0-9]{9}/i);
  if (fromHtml) {
    const m = fromHtml[0].match(/^(BV)(1[a-zA-Z0-9]{9})$/i)!;
    return `BV${m[2]}`;
  }

  throw new Error('短链解析失败，未找到 BV 号');
}

export async function handleBilibiliQuery(query: {
  bvid?: string | null;
  aid?: string | null;
  url?: string | null;
  type?: string | null;
  clientKey?: string | null;
}) {
  const { bvid, aid, url, type = 'view', clientKey } = query;
  const key = clientKey || undefined;

  if (type === 'resolve') {
    if (!url) throw Object.assign(new Error('resolve 需要 url 参数'), { status: 400 });
    const resolved = await resolveShortUrl(url, key);
    return { code: 0, data: { bvid: resolved } };
  }

  if (type === 'course') {
    if (bvid) {
      const data = await handleCourse(bvid, key);
      return { code: 0, data };
    }
    if (aid) {
      const view = await fetchBiliJson(
        `https://api.bilibili.com/x/web-interface/view?aid=${encodeURIComponent(aid)}`,
        null,
        8000
      );
      const resolvedBvid = String((view.data as Record<string, unknown>)?.bvid || '');
      if (!resolvedBvid) throw new Error('av 号无效');
      const data = await handleCourse(resolvedBvid, key);
      return { code: 0, data };
    }
    throw Object.assign(new Error('course 需要 bvid 或 aid 参数'), { status: 400 });
  }

  let apiUrl: string;
  if (type === 'player_pagelist') {
    if (!bvid) throw Object.assign(new Error('需要 bvid'), { status: 400 });
    apiUrl = `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp`;
  } else if (type === 'pagelist') {
    if (!bvid) throw Object.assign(new Error('需要 bvid'), { status: 400 });
    apiUrl = `https://api.bilibili.com/x/web-interface/pagelist?bvid=${encodeURIComponent(bvid)}`;
  } else if (bvid) {
    apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
  } else if (aid) {
    apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${encodeURIComponent(aid)}`;
  } else {
    throw Object.assign(new Error('缺少 bvid 或 aid 参数'), { status: 400 });
  }

  if (key) assertClientLimit(key);
  const data = await fetchBiliJson(apiUrl, bvid || null, 8000);
  return data;
}
