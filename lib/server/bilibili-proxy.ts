import type { Course, Episode } from '../types';

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

async function fetchBiliJson(url: string, bvid?: string | null) {
  const response = await fetch(url, {
    headers: buildHeaders(bvid),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.code !== 0) throw new Error(data.message || `B站 code=${data.code}`);
  return data;
}

async function fetchPages(bvid: string) {
  const sources = [
    {
      name: 'player_pagelist',
      url: `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp`
    },
    {
      name: 'web_pagelist',
      url: `https://api.bilibili.com/x/web-interface/pagelist?bvid=${encodeURIComponent(bvid)}`
    }
  ];

  let lastErr: Error | undefined;
  for (const src of sources) {
    try {
      const json = await fetchBiliJson(src.url, bvid);
      if (Array.isArray(json.data) && json.data.length) return json.data;
    } catch (e) {
      lastErr = e as Error;
      console.warn(`pagelist ${src.name} failed:`, (e as Error).message);
    }
  }
  throw lastErr || new Error('分P列表为空');
}

function normalizeCover(url: string) {
  if (!url) return '';
  return String(url).replace(/^http:\/\//i, 'https://');
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

export async function handleCourse(bvid: string): Promise<Course> {
  const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

  let viewData: Record<string, unknown> | null = null;
  let pages: Record<string, unknown>[] = [];

  const [viewR, pagesR] = await Promise.allSettled([
    fetchBiliJson(viewUrl, bvid),
    fetchPages(bvid)
  ]);

  if (viewR.status === 'fulfilled') {
    viewData = viewR.value.data;
    if (Array.isArray(viewData?.pages) && viewData.pages.length) {
      pages = viewData.pages as Record<string, unknown>[];
    }
  }

  if (pagesR.status === 'fulfilled') {
    pages = pagesR.value;
  } else if (!pages.length && viewR.status === 'fulfilled' && Array.isArray(viewData?.pages)) {
    pages = viewData.pages as Record<string, unknown>[];
  }

  if (!pages.length) {
    const err = pagesR.status === 'rejected' ? pagesR.reason : viewR.status === 'rejected' ? viewR.reason : new Error('未找到分P');
    throw new Error((err as Error).message || '未找到分P信息');
  }

  if (!viewData) {
    viewData = { bvid, title: pages[0]?.part || bvid, pic: '' };
  }

  return buildCourse(viewData, pages, bvid);
}

export async function handleBilibiliQuery(query: {
  bvid?: string | null;
  aid?: string | null;
  type?: string | null;
}) {
  const { bvid, aid, type = 'view' } = query;

  if (type === 'course') {
    if (!bvid) throw Object.assign(new Error('course 需要 bvid 参数'), { status: 400 });
    const data = await handleCourse(bvid);
    return { code: 0, data };
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

  const data = await fetchBiliJson(apiUrl, bvid || null);
  return data;
}
