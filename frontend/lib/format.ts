export function formatDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}小时${m}分钟`;
  if (m > 0) return `${m}分钟`;
  return sec > 0 ? '不足1分钟' : '0分钟';
}

export function formatShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}秒`;
}

export function normalizeCover(url: string): string {
  if (!url) return '';
  let u = String(url).trim().replace(/&amp;/g, '&');
  if (!u) return '';
  if (u.startsWith('//')) u = `https:${u}`;
  u = u.replace(/^http:\/\//i, 'https://');
  // 去掉过大尺寸参数，提升兼容性
  u = u.replace(/@\d+w_\d+h[^/?#]*$/i, '');
  return u;
}

/** 生成封面候选地址（原图 + 常见 hdslb CDN 镜像） */
export function coverFallbacks(url: string): string[] {
  const base = normalizeCover(url);
  if (!base) return [];
  const list = [base];
  const m = base.match(/^(https:\/\/)(i\d)\.hdslb\.com(\/.*)$/i);
  if (m) {
    for (const host of ['i0', 'i1', 'i2']) {
      if (host !== m[2].toLowerCase()) list.push(`${m[1]}${host}.hdslb.com${m[3]}`);
    }
  }
  return [...new Set(list)];
}
