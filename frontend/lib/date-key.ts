const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export function dateKey(input: Date | string) {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDayHeading(key: string) {
  const date = parseDateKey(key);
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weeks[date.getDay()]}`;
}

export function sameDay(iso: string, key: string) {
  return dateKey(iso) === key;
}

export { WEEKDAYS };
