import type { Course } from './types';
import { normalizeCover } from './format';
import { resolveVideoId } from './bvid';

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

export async function fetchCourse(input: string): Promise<Course> {
  const bvid = await resolveVideoId(input);

  const cached = getClientCache(bvid);
  if (cached?.episodes?.length) {
    return { ...cached, cover: normalizeCover(cached.cover || '') };
  }

  const res = await fetch(`/api/bilibili?bvid=${encodeURIComponent(bvid)}&type=course`, {
    signal: fetchSignal(20000)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `后端 HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== 0 || !json.data?.episodes?.length) {
    throw new Error(json.message || '后端返回数据无效');
  }
  const data = { ...(json.data as Course), cover: normalizeCover((json.data as Course).cover || '') };
  setClientCache(data.bvid || bvid, data);
  return data;
}
