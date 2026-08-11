/**
 * B 站课程数据代理 — 借鉴 yt-dlp 的多端点策略，针对「规划器」场景做速度优化：
 * 1. 快路径：只打一次 view（自带 title / pic / pages）
 * 2. 缺分P 时再竞速 pagelist 端点（Promise.any，谁先成功用谁）
 * 3. 不在热路径走 allorigins 等慢代理
 * 4. 进程内短 TTL 缓存，重复规划秒回
 */
import type { Course, Episode } from '../types';

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

/** 直连 B 站（热路径）；超时压到 8s，失败即抛，不拖慢 */
async function fetchBiliJson(url: string, bvid?: string | null, timeoutMs = 8000) {
  const response = await fetch(url, {
    headers: buildHeaders(bvid),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(friendlyBiliError(Number(data.code), data.message));
  }
  return data as { code: number; message?: string; data: unknown };
}

/** yt-dlp 同款：多个端点竞速，谁先成功用谁 */
async function raceJson(
  urls: string[],
  bvid: string,
  timeoutMs = 8000
): Promise<{ code: number; data: unknown }> {
  const errors: string[] = [];
  return await new Promise((resolve, reject) => {
    let pending = urls.length;
    let settled = false;
    for (const url of urls) {
      fetchBiliJson(url, bvid, timeoutMs)
        .then((data) => {
          if (settled) return;
          settled = true;
          resolve(data);
        })
        .catch((e: Error) => {
          errors.push(e.message);
          pending -= 1;
          if (!settled && pending <= 0) {
            reject(new Error(errors[0] || '全部端点失败'));
          }
        });
    }
  });
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

function getCached(bvid: string): Course | null {
  const hit = courseCache.get(bvid);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    courseCache.delete(bvid);
    return null;
  }
  return hit.data;
}

function setCached(bvid: string, data: Course) {
  courseCache.set(bvid, { data, ts: Date.now() });
}

/**
 * 快路径（yt-dlp / 旧版最优路径）：
 * view 一次拿齐元数据 + 分P；只有 pages 缺失才竞速 pagelist。
 */
export async function handleCourse(bvid: string): Promise<Course> {
  const cached = getCached(bvid);
  if (cached) return cached;

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

  // pages 已够用 → 立即返回（通常 1 次 RTT）
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
    const raced = await raceJson(pageUrls, bvid, 8000);
    pages = asPages(raced.data);
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

export async function resolveShortUrl(rawUrl: string): Promise<string> {
  const url = rawUrl.trim();
  if (!url) throw new Error('缺少 url 参数');

  const response = await fetch(url, {
    headers: buildHeaders(null),
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });

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
}) {
  const { bvid, aid, url, type = 'view' } = query;

  if (type === 'resolve') {
    if (!url) throw Object.assign(new Error('resolve 需要 url 参数'), { status: 400 });
    const resolved = await resolveShortUrl(url);
    return { code: 0, data: { bvid: resolved } };
  }

  if (type === 'course') {
    if (bvid) {
      const data = await handleCourse(bvid);
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
      const data = await handleCourse(resolvedBvid);
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

  const data = await fetchBiliJson(apiUrl, bvid || null, 8000);
  return data;
}
