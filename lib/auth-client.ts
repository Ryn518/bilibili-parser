import type { ApiResponse, AuthSession } from './types';

export async function authApi<T>(
  action: string,
  body?: { username?: string; password?: string },
  token?: string
): Promise<ApiResponse<T>> {
  const opts: RequestInit = { method: body ? 'POST' : 'GET', headers: {} };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  } else if (token) {
    opts.headers = { Authorization: `Bearer ${token}` };
  }
  const res = await fetch(`/api/auth?action=${action}`, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('认证服务未就绪');
  }
}

export type SessionData = AuthSession;
