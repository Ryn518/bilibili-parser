export function normalizeBvid(bv: string | null | undefined): string | null {
  if (!bv) return null;
  // B 站 BV 号大小写敏感，只能规范前缀 BV，不能整体 toUpperCase
  const m = String(bv).trim().match(/^(BV)(1[a-zA-Z0-9]{9})$/i);
  if (!m) return null;
  return `BV${m[2]}`;
}

export function bvidMatch(a: string, b: string): boolean {
  return !!a && !!b && a === b;
}

export function cleanPasteText(raw: string): string {
  return String(raw)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/([\u4e00-\u9fff\w])+(https?:\/\/)/gi, '$1 $2')
    .trim();
}

export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /https?:\/\/(?:www\.)?bilibili\.com\/[^\s\u3000【】[\]（）<>"']+/gi,
    /https?:\/\/b23\.tv\/[^\s\u3000【】[\]（）<>"']+/gi,
    /(?:^|\s)((?:www\.)?bilibili\.com\/video\/[^\s\u3000【】[\]（）<>"']+)/gi
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      let u = (m[1] || m[0]).trim();
      u = u.replace(/[，。！？；、)】」'"<>]+$/g, '');
      if (!u.startsWith('http')) u = 'https://' + u;
      urls.push(u);
    }
  }
  return [...new Set(urls)];
}

export type VideoId = string | { aid: string } | { shortUrl: string };

export function extractIdFromUrl(url: string): VideoId | null {
  const bv = url.match(/bilibili\.com\/video\/(BV1[a-zA-Z0-9]{9})/i);
  if (bv) return normalizeBvid(bv[1]);
  const av = url.match(/bilibili\.com\/video\/av(\d+)/i);
  if (av) return { aid: av[1] };
  if (/b23\.tv/i.test(url)) return { shortUrl: url };
  return null;
}

export function extractBvFromText(text: string): VideoId | null {
  text = cleanPasteText(text);
  for (const u of extractUrls(text)) {
    const id = extractIdFromUrl(u);
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && 'aid' in id) return id;
  }
  const all = [...text.matchAll(/BV1[a-zA-Z0-9]{9}/gi)];
  if (all.length) return normalizeBvid(all[all.length - 1][0]);
  const av = text.match(/(?:\/video\/)?av(\d+)/i) || text.match(/\bav(\d+)\b/i);
  if (av) return { aid: av[1] };
  for (const u of extractUrls(text)) {
    const id = extractIdFromUrl(u);
    if (id && typeof id === 'object' && 'shortUrl' in id) return id;
  }
  return null;
}

export function parsePasteInput(raw: string) {
  const text = cleanPasteText(raw);
  const titleMatch =
    text.match(/[【\[]([^\]]{2,80}?)[】\]]/) || text.match(/^(.{2,80}?)(?=https?:\/\/)/);
  const hintTitle = titleMatch ? titleMatch[1].replace(/^[【\[]+/, '').trim() : '';
  return { videoId: extractBvFromText(text), hintTitle };
}

function fetchSignal(ms = 15000): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

/** 解析粘贴内容为 BV 号（含短链、av 号） */
export async function resolveVideoId(input: string): Promise<string> {
  const parsed = parsePasteInput(input);
  const id = parsed.videoId;

  if (typeof id === 'string') return id;

  if (id && 'aid' in id) {
    const res = await fetch(`/api/bilibili?type=course&aid=${encodeURIComponent(id.aid)}`, {
      signal: fetchSignal(20000)
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.bvid) return json.data.bvid as string;
    throw new Error(json.message || 'av 号解析失败');
  }

  if (id && 'shortUrl' in id) {
    const res = await fetch(`/api/bilibili?type=resolve&url=${encodeURIComponent(id.shortUrl)}`, {
      signal: fetchSignal(20000)
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.bvid) return json.data.bvid as string;
    throw new Error(json.message || '短链解析失败，请粘贴完整链接');
  }

  for (const u of extractUrls(cleanPasteText(input))) {
    if (!/b23\.tv/i.test(u)) continue;
    const res = await fetch(`/api/bilibili?type=resolve&url=${encodeURIComponent(u)}`, {
      signal: fetchSignal(20000)
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.bvid) return json.data.bvid as string;
  }

  throw new Error('无法识别 BV 号，请粘贴完整 B 站分享内容');
}
