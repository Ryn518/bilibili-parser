const KEY = 'bili-planner-client-id';

export function getClientId() {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(KEY);
  if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
  const next = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(KEY, next);
  return next;
}
