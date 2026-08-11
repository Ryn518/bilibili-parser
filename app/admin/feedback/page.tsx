'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';

interface FeedbackItem {
  id: string;
  message: string;
  contact: string;
  username: string;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const auth = useAuth();
  const { openAuth } = useUiStore();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!auth.session?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback?limit=50', {
        headers: { Authorization: `Bearer ${auth.session.token}` }
      });
      const json = await res.json();
      if (!res.ok || json.code !== 0) {
        throw new Error(json.message || '加载失败');
      }
      setItems(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [auth.session?.token]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) {
      setLoading(false);
      return;
    }
    if (!auth.isAdmin) {
      setLoading(false);
      setError('仅管理员可查看用户反馈');
      return;
    }
    load();
  }, [auth.loading, auth.session, auth.isAdmin, load]);

  if (auth.loading) {
    return <p className="py-16 text-center text-text2">加载中…</p>;
  }

  if (!auth.session) {
    return (
      <div className="mx-auto max-w-[640px] px-5 py-16 text-center">
        <p className="mb-4 text-text2">请先使用管理员账号登录</p>
        <button type="button" onClick={() => openAuth('login')} className="btn-accent">
          登录
        </button>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="mx-auto max-w-[640px] px-5 py-16 text-center">
        <p className="text-text2">当前账号无权限查看反馈</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent-text hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">用户反馈</h1>
        <button type="button" onClick={load} className="rounded-full border border-border px-3 py-1.5 text-xs text-text2 hover:border-accent">
          刷新
        </button>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-text3">
        部署在 Vercel 时，历史反馈可能因服务器重启而丢失。建议配置{' '}
        <code className="rounded bg-surface2 px-1">FEEDBACK_PUSHPLUS_TOKEN</code>，新留言会推送到微信。
      </p>
      {loading && <p className="text-text2">加载中…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-text2">暂无反馈</p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text3">
              <span>{item.username}</span>
              <span>{item.contact}</span>
              <span>{new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{item.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
