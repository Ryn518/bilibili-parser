'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONFIG } from '@/lib/config';
import { authApi, type SessionData } from '@/lib/auth-client';
import { getStorageItem, removeStorageItem, setStorageItem } from '@/lib/storage';
import type { VipInfo } from '@/lib/types';

interface AuthContextValue {
  session: SessionData | null;
  vip: VipInfo | null;
  loading: boolean;
  isAdmin: boolean;
  isVip: boolean;
  isUnlimited: boolean;
  freeRemaining: number;
  canPlan: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  setVipDemo: (days?: number) => void;
  consumePlanQuota: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getSession(): SessionData | null {
  const s = getStorageItem<SessionData | null>(CONFIG.AUTH_SESSION_KEY, null);
  if (!s?.token || !s?.username) return null;
  if (s.expiresAt && Date.now() > s.expiresAt) return null;
  return s;
}

function getVipInfo(): VipInfo | null {
  try {
    const vip = getStorageItem<VipInfo | null>(CONFIG.VIP_KEY, null);
    if (!vip?.expireAt || Date.now() > vip.expireAt) {
      removeStorageItem(CONFIG.VIP_KEY);
      return null;
    }
    return vip;
  } catch {
    return null;
  }
}

function getUsageRecord() {
  const store = getStorageItem<{ month?: string; count?: number }>(CONFIG.USAGE_KEY, {});
  const month = new Date().toISOString().slice(0, 7);
  if (store.month !== month) return { month, count: 0 };
  return { month, count: store.count || 0 };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [vip, setVip] = useState<VipInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(getUsageRecord);

  const refreshSession = useCallback(async () => {
    const local = getSession();
    if (!local?.token) {
      setSession(null);
      setVip(getVipInfo());
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
      } else {
        removeStorageItem(CONFIG.AUTH_SESSION_KEY);
        setSession(null);
      }
    } catch {
      setSession(local);
    }
    setVip(getVipInfo());
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const isAdmin = session?.role === 'admin';
  const isVipActive = !!vip;
  const isUnlimited = isAdmin || isVipActive;
  const freeRemaining = Math.max(0, CONFIG.FREE_PLAN_LIMIT - usage.count);
  const canPlan = !!session && (isUnlimited || freeRemaining > 0);

  const saveSessionData = (data: SessionData) => {
    setStorageItem(CONFIG.AUTH_SESSION_KEY, data);
    setSession(data);
  };

  const login = async (username: string, password: string) => {
    const res = await authApi<SessionData>('login', { username, password });
    if (res.code !== 0 || !res.data) return res.message || '登录失败';
    saveSessionData(res.data);
    setVip(getVipInfo());
    return null;
  };

  const register = async (username: string, password: string) => {
    const res = await authApi<SessionData>('register', { username, password });
    if (res.code !== 0 || !res.data) return res.message || '注册失败';
    saveSessionData(res.data);
    return null;
  };

  const logout = () => {
    removeStorageItem(CONFIG.AUTH_SESSION_KEY);
    setSession(null);
  };

  const setVipDemo = (days: number = CONFIG.PRICING.days) => {
    const info: VipInfo = {
      expireAt: Date.now() + days * 86400000,
      plan: 'monthly',
      activatedAt: Date.now()
    };
    setStorageItem(CONFIG.VIP_KEY, info);
    setVip(info);
  };

  const consumePlanQuota = () => {
    if (!session || isUnlimited) return true;
    if (usage.count >= CONFIG.FREE_PLAN_LIMIT) return false;
    const next = { month: usage.month, count: usage.count + 1 };
    setStorageItem(CONFIG.USAGE_KEY, next);
    setUsage(next);
    return true;
  };

  const value = useMemo(
    () => ({
      session,
      vip,
      loading,
      isAdmin,
      isVip: isVipActive,
      isUnlimited,
      freeRemaining,
      canPlan,
      login,
      register,
      logout,
      refreshSession,
      setVipDemo,
      consumePlanQuota
    }),
    [session, vip, loading, isAdmin, isVipActive, isUnlimited, freeRemaining, canPlan, usage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
