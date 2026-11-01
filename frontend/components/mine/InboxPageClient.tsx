'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';
import { CONFIG } from '@/lib/config';
import { MineTabs } from '@/components/mine/MineTabs';

type InboxItem = {
  id: string;
  kind: 'like' | 'comment' | 'comment_like';
  at: string;
  from: string;
  postId: string;
  postPreview: string;
  commentPreview?: string;
};

function seenKey(username: string) {
  return `${CONFIG.INBOX_SEEN_KEY}:${username}`;
}

export function markInboxSeen(username: string) {
  try {
    localStorage.setItem(seenKey(username), new Date().toISOString());
    window.dispatchEvent(new Event('inbox-seen'));
  } catch {
    /* ignore */
  }
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function titleOf(item: InboxItem) {
  if (item.kind === 'like') return `${item.from} 赞了你的动态`;
  if (item.kind === 'comment_like') return `${item.from} 赞了你的评论`;
  return `${item.from} 评论了你`;
}

export function InboxPageClient() {
  const auth = useAuth();
  const { openAuth } = useUiStore();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session?.token) {
      setItems([]);
      return;
    }
    const username = auth.session.username;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/plaza/inbox', {
        headers: { Authorization: `Bearer ${auth.session!.token}` }
      });
      const json = (await res.json()) as { code: number; message?: string; data?: { items: InboxItem[] } };
      if (cancelled) return;
      if (json.code !== 0) {
        setMessage(json.message || '加载失败');
        setItems([]);
        return;
      }
      setItems(json.data?.items || []);
      markInboxSeen(username);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.session?.token, auth.session?.username]);

  return (
    <div className="flex justify-center px-5 py-10 pb-28 max-md:px-4">
      <div className="w-full min-w-0 max-w-[1080px]">
      <MineTabs active="inbox" />
      <h1 className="mb-6 text-2xl font-bold text-ink">收到的互动</h1>
      {!auth.session ? (
        <p className="text-text2">
          请先
          <button type="button" className="mx-1 text-accent-text underline" onClick={() => openAuth('login')}>
            登录
          </button>
          后查看别人给你的赞和评论。
        </p>
      ) : items === null ? (
        <p className="text-text2">加载中…</p>
      ) : message ? (
        <p className="text-text2">{message}</p>
      ) : items.length === 0 ? (
        <p className="text-text2">还没有人给你点赞或评论。</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/plaza#plaza-${item.postId}`}
                className="block rounded-[14px] border border-border bg-surface p-4 shadow-card transition hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{titleOf(item)}</p>
                  <span className="shrink-0 text-xs text-text3">{formatTime(item.at)}</span>
                </div>
                {item.kind === 'comment' && item.commentPreview ? (
                  <p className="mt-1.5 text-sm leading-6 text-text2">{item.commentPreview}</p>
                ) : null}
                <p className="mt-2 truncate text-xs text-text3">原帖：{item.postPreview || '图片动态'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
