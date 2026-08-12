'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONFIG } from '@/lib/config';
import { authApi, type RegisterResult, type SessionData } from '@/lib/auth-client';
import { getLocalAuthRecord, hasLocalAuthRecord, saveLocalAuthRecord } from '@/lib/auth-local';
import { clearUserSessionPlanKeys, getStorageItem, removeStorageItem, setStorageItem, setStorageUser } from '@/lib/storage';

interface AuthContextValue {
  session: SessionData | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getSession(): SessionData | null {
  const s = getStorageItem<SessionData | null>(CONFIG.AUTH_SESSION_KEY, null);
  if (!s?.token || !s?.username) return null;
  if (s.expiresAt && Date.now() > s.expiresAt) return null;
  return s;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserStorage = useCallback((username: string | null) => {
    setStorageUser(username);
  }, []);

  const refreshSession = useCallback(async () => {
    const local = getSession();
    if (!local?.token) {
      setSession(null);
      syncUserStorage(null);
      return;
    }
    try {
      const res = await authApi<{ username: string; role: 'user' | 'admin'; expiresAt: number }>(
        'me',
        undefined,
        local.token
      );
      if (res.code === 0 && res.data) {
        const next = { ...local, username: res.data.username, role: res.data.role, expiresAt: res.data.expiresAt };
        setStorageItem(CONFIG.AUTH_SESSION_KEY, next);
        setSession(next);
        syncUserStorage(next.username);
      } else {
        removeStorageItem(CONFIG.AUTH_SESSION_KEY);
        setSession(null);
        syncUserStorage(null);
      }
    } catch {
      setSession(local);
      syncUserStorage(local.username);
    }
  }, [syncUserStorage]);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const isAdmin = session?.role === 'admin';

  const saveSessionData = (data: SessionData) => {
    setStorageItem(CONFIG.AUTH_SESSION_KEY, data);
    setSession(data);
    syncUserStorage(data.username);
  };

  const login = async (username: string, password: string) => {
    const authRecord = getLocalAuthRecord(username) || undefined;
    const res = await authApi<SessionData>('login', { username, password, authRecord });
    if (res.code !== 0 || !res.data) return res.message || '登录失败';
    saveSessionData(res.data);
    return null;
  };

  const register = async (username: string, password: string) => {
    if (hasLocalAuthRecord(username)) {
      return '本机已有该用户名，请直接登录';
    }
    const res = await authApi<RegisterResult>('register', { username, password });
    if (res.code !== 0 || !res.data) return res.message || '注册失败';
    if (res.data.authRecord) {
      saveLocalAuthRecord(username, res.data.authRecord);
    }
    const { authRecord: _ignored, ...session } = res.data;
    saveSessionData(session);
    return null;
  };

  const logout = () => {
    clearUserSessionPlanKeys(session?.username);
    removeStorageItem(CONFIG.AUTH_SESSION_KEY);
    setSession(null);
    syncUserStorage(null);
  };

  const value = useMemo(
    () => ({
      session,
      loading,
      isAdmin,
      login,
      register,
      logout,
      refreshSession
    }),
    [session, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
