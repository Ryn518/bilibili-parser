'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CONFIG } from '@/lib/config';

function seenAt(username: string) {
  try {
    return Date.parse(localStorage.getItem(`${CONFIG.INBOX_SEEN_KEY}:${username}`) || '') || 0;
  } catch {
    return 0;
  }
}

export function InboxBell() {
  const auth = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!auth.session?.token || !auth.session.username) {
      setUnread(0);
      return;
    }
    try {
      const res = await fetch('/api/plaza/inbox', {
        headers: { Authorization: `Bearer ${auth.session.token}` }
      });
      const json = (await res.json()) as { code: number; data?: { items?: { at: string }[] } };
      if (json.code !== 0) return;
      const seen = seenAt(auth.session.username);
      const count = (json.data?.items || []).filter((item) => Date.parse(item.at) > seen).length;
      setUnread(count);
    } catch {
      /* ignore */
    }
  }, [auth.session?.token, auth.session?.username]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onSeen = () => void refresh();
    window.addEventListener('focus', onSeen);
    window.addEventListener('inbox-seen', onSeen);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onSeen);
      window.removeEventListener('inbox-seen', onSeen);
    };
  }, [refresh]);

  if (!auth.session) return null;

  return (
    <Link
      href="/mine/inbox"
      title={unread ? `有 ${unread} 条新的赞或评论` : '收到的互动'}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text2 shadow-sm hover:border-accent hover:text-accent-text"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
        <path
          d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-[16px] text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
