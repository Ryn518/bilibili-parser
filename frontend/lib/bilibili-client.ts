import type { Course } from './types';
import { normalizeCover } from './format';
import { loadBilibiliView } from './bilibili-jsonp';
import { extensionConnected, planningNeedsExtension, requestCourseFromExtension } from './extension-bridge';
import { resolveVideoId, parsePasteInput } from './bvid';

const CLIENT_CACHE_TTL = 30 * 60 * 1000;
const memCache = new Map<string, { data: Course; ts: number }>();

function fetchSignal(ms = 20000): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

function getClientCache(bvid: string): Course | null {
  const mem = memCache.get('v4:' + bvid);
  if (mem && Date.now() - mem.ts < CLIENT_CACHE_TTL) return mem.data;
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('bc4_' + bvid);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: Course; ts: number };
    if (Date.now() - ts > CLIENT_CACHE_TTL) return null;
    memCache.set('v4:' + bvid, { data, ts });
    return data;
  } catch {
    return null;
  }
}

function setClientCache(bvid: string, data: Course) {
  const entry = { data, ts: Date.now() };
  memCache.set('v4:' + bvid, entry);
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem('bc4_' + bvid, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

const shortLinkHint = '这是短链接。请先在浏览器打开，再把地址栏里带 BV 号的完整链接贴过来';

export async function fetchCourse(input: string): Promise<Course> {
  if (extensionConnected()) return courseFromExtension(input);

  const parsed = parsePasteInput(input);
  const id = parsed.videoId;
  if (typeof id === 'string' || (id && 'aid' in id)) {
    const knownBvid = typeof id === 'string' ? id : '';
    if (knownBvid) {
      const cached = getClientCache(knownBvid);
      if (cached?.episodes?.length) {
        return { ...cached, cover: normalizeCover(cached.cover || '') };
      }
    }
    try {
      return await courseFromBrowser(typeof id === 'string' ? { bvid: id } : { aid: id.aid });
    } catch (error) {
      if (planningNeedsExtension()) throw error;
    }
  } else if (planningNeedsExtension()) {
    throw new Error(shortLinkHint);
  }

  const bvid = await resolveVideoId(input);
  const cached = getClientCache(bvid);
  if (cached?.episodes?.length) {
    return { ...cached, cover: normalizeCover(cached.cover || '') };
  }
  const data = await courseFromServer(bvid);
  setClientCache(data.bvid || bvid, data);
  return data;
}

async function courseFromBrowser(query: { bvid?: string; aid?: string }): Promise<Course> {
  const view = await loadBilibiliView(query);
  return shapeView(view, '已读到课程，但没有整理出分集');
}

async function courseFromExtension(input: string): Promise<Course> {
  const parsed = parsePasteInput(input);
  if (typeof parsed.videoId === 'string') {
    const cached = getClientCache(parsed.videoId);
    if (cached?.episodes?.length) {
      return { ...cached, cover: normalizeCover(cached.cover || '') };
    }
  }
  const viaPlugin = await requestCourseFromExtension(input);
  const again = getClientCache(viaPlugin.bvid);
  if (again?.episodes?.length) {
    return { ...again, cover: normalizeCover(again.cover || '') };
  }
  return shapeView(viaPlugin.view, '插件已取到课程，但没有整理出分集');
}

async function shapeView(view: Record<string, unknown>, emptyMessage: string): Promise<Course> {
  const res = await fetch('/api/bilibili/shape', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: view }),
    signal: fetchSignal(20000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0 || !json.data?.episodes?.length) {
    throw new Error(json.message || emptyMessage);
  }
  const data = { ...(json.data as Course), cover: normalizeCover((json.data as Course).cover || '') };
  setClientCache(data.bvid || String(view.bvid || ''), data);
  return data;
}

async function courseFromServer(bvid: string): Promise<Course> {
  const res = await fetch(`/api/bilibili?bvid=${encodeURIComponent(bvid)}&type=course`, {
    signal: fetchSignal(20000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0 || !json.data?.episodes?.length) {
    throw new Error(json.message || '后端返回数据无效');
  }
  return { ...(json.data as Course), cover: normalizeCover((json.data as Course).cover || '') };
}
