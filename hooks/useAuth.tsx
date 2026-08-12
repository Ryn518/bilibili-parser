'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONFIG } from '@/lib/config';
import { authApi, type RegisterResult, type SessionData } from '@/lib/auth-client';
import { getLocalAuthRecord, hasLocalAuthRecord, saveLocalAuthRecord } from '@/lib/auth-local';
import { configureCloudSync, pullAndMergeCloudSync } from '@/lib/cloud-sync';
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
      configureCloudSync({ token: null, username: null, enabled: false });
      setSession(null);
      syncUserStorage(null);
      return;
    }
    try {
      const res = await authApi<{
        username: string;
        role: 'user' | 'admin';
        expiresAt: number;
        userId?: string;
      }>('me', undefined, local.token);
      if (res.code === 0 && res.data) {
        const next: SessionData = {
          ...local,
          username: res.data.username,
          role: res.data.role,
          expiresAt: res.data.expiresAt,
          userId: res.data.userId
        };
        syncUserStorage(next.username);
        configureCloudSync({
          token: next.token,
          username: next.username,
          enabled: !!next.userId
        });
        if (next.userId) {
          try {
            await pullAndMergeCloudSync(next.username, next.token);
          } catch {
            /* 云同步失败不阻断会话恢复 */
          }
        }
        setStorageItem(CONFIG.AUTH_SESSION_KEY, next);
        setSession(next);
      } else {
        removeStorageItem(CONFIG.AUTH_SESSION_KEY);
        configureCloudSync({ token: null, username: null, enabled: false });
        setSession(null);
        syncUserStorage(null);
      }
    } catch {
      setSession(local);
      syncUserStorage(local.username);
      configureCloudSync({
        token: local.token,
        username: local.username,
        enabled: !!local.userId
      });
    }
  }, [syncUserStorage]);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const isAdmin = session?.role === 'admin';

  const finalizeSession = async (data: RegisterResult) => {
    if (data.authRecord) {
      saveLocalAuthRecord(data.username, data.authRecord);
    }
    const { authRecord: _ignored, ...sessionData } = data;
    syncUserStorage(sessionData.username);
    configureCloudSync({
      token: sessionData.token,
      username: sessionData.username,
      enabled: !!sessionData.userId
    });
    if (sessionData.userId) {
      await pullAndMergeCloudSync(sessionData.username, sessionData.token);
    }
    setStorageItem(CONFIG.AUTH_SESSION_KEY, sessionData);
    setSession(sessionData);
  };

  const login = async (username: string, password: string) => {
    const authRecord = getLocalAuthRecord(username) || undefined;
    const res = await authApi<RegisterResult>('login', { username, password, authRecord });
    if (res.code !== 0 || !res.data) return res.message || '登录失败';
    try {
      await finalizeSession(res.data);
    } catch (err) {
      return err instanceof Error ? err.message : '云同步失败';
    }
    return null;
  };

  const register = async (username: string, password: string) => {
    if (hasLocalAuthRecord(username)) {
      return '本机已有该用户名，请直接登录';
    }
    const res = await authApi<RegisterResult>('register', { username, password });
    if (res.code !== 0 || !res.data) return res.message || '注册失败';
    try {
      await finalizeSession(res.data);
    } catch (err) {
      return err instanceof Error ? err.message : '云同步失败';
    }
    return null;
  };

  const logout = () => {
    clearUserSessionPlanKeys(session?.username);
    removeStorageItem(CONFIG.AUTH_SESSION_KEY);
    configureCloudSync({ token: null, username: null, enabled: false });
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
    [session, loading, isAdmin, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
