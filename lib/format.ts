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
  return String(url).replace(/^http:\/\//i, 'https://');
}
