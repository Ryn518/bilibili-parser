/**
 * 单机内存限流（一台 PM2 进程够用）。
 * - 按 IP：防止单人拿本站当爬虫
 * - 全站间隔：压住打向 B 站的请求
 */

const IP_MAX_PER_MIN = 12;
const IP_MAX_PER_10_MIN = 40;
const BILI_GAP_MS = 1000;
const COOLDOWN_MS = 30_000;

const hits = new Map<string, number[]>();
let nextBiliAt = 0;
let cooldownUntil = 0;
let biliQueue: Promise<void> = Promise.resolve();

function prune(key: string, now: number) {
  const kept = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (kept.length) hits.set(key, kept);
  else hits.delete(key);
}

export function clientKeyFromRequest(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const real = headers.get('x-real-ip');
  const ip = (forwarded?.split(',')[0] || real || '').trim() || 'unknown';
  return ip;
}

export function assertClientLimit(clientKey: string) {
  const now = Date.now();
  prune(clientKey, now);
  const list = hits.get(clientKey) || [];
  const lastMin = list.filter((t) => now - t < 60 * 1000);
  if (lastMin.length >= IP_MAX_PER_MIN || list.length >= IP_MAX_PER_10_MIN) {
    throw Object.assign(new Error('解析过于频繁，请稍后再试'), { status: 429 });
  }
  list.push(now);
  hits.set(clientKey, list);
}

export function noteBiliBusy() {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + COOLDOWN_MS);
}

export async function withBiliSlot<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const mine = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = biliQueue;
  biliQueue = prev.then(() => mine);
  await prev;

  try {
    const now = Date.now();
    if (now < cooldownUntil) {
      const wait = cooldownUntil - now;
      if (wait > 8000) {
        throw Object.assign(new Error('B站接口繁忙，请稍后再试'), { status: 429 });
      }
      await new Promise((r) => setTimeout(r, wait));
    }
    const gap = nextBiliAt - Date.now();
    if (gap > 0) await new Promise((r) => setTimeout(r, gap));
    nextBiliAt = Date.now() + BILI_GAP_MS;
    return await fn();
  } finally {
    release();
  }
}
