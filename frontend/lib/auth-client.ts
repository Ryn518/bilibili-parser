import type { ApiResponse, AuthSession } from './types';

export interface AuthCredentialPayload {
  username?: string;
  password?: string;
  authRecord?: { salt: string; hash: string };
}

export async function authApi<T>(
  action: string,
  body?: AuthCredentialPayload,
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

export interface RegisterResult extends AuthSession {
  authRecord?: { salt: string; hash: string };
}
