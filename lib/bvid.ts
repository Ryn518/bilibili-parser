export function normalizeBvid(bv: string | null | undefined): string | null {
  if (!bv) return null;
  const m = String(bv).match(/^(BV1[a-zA-Z0-9]{9})$/i);
  return m ? m[1].toUpperCase() : null;
}

export function bvidMatch(a: string, b: string): boolean {
  return !!a && !!b && a.toUpperCase() === b.toUpperCase();
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
