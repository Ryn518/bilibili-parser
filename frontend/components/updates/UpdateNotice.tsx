'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SEEN_KEY = 'bili-planner-update-invite';

interface SiteUpdate {
  id: string;
  version: string;
  title: string;
  content: string;
  images?: string[];
}

export function UpdateNotice() {
  const router = useRouter();
  const [item, setItem] = useState<SiteUpdate | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/updates?latest=1')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || json.code !== 0 || !json.data?.id) return;
        if (window.location.pathname === '/updates') {
          localStorage.setItem(SEEN_KEY, json.data.id);
          return;
        }
        const seen = localStorage.getItem(SEEN_KEY);
        if (seen === json.data.id) return;
        setItem(json.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!item) return null;

  const close = () => {
    localStorage.setItem(SEEN_KEY, item.id);
    setItem(null);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 140 }}>
      <div className="modal max-w-[380px] text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-accent-text">{item.version}</p>
        <h3 className="mt-2 text-xl font-bold text-ink">去看看新的更新吧</h3>
        <p className="mt-2 text-sm leading-relaxed text-text2">
          {item.title ? `「${item.title}」已经发布。` : '有一条新更新。'}
          到更新页可以看这次改了什么。
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={close} className="flex-1 rounded-[10px] border border-border py-2.5 text-sm font-semibold text-text2">
            先不用
          </button>
          <button
            type="button"
            className="btn-accent flex-1"
            onClick={() => {
              localStorage.setItem(SEEN_KEY, item.id);
              setItem(null);
              router.push('/updates');
            }}
          >
            去更新页
          </button>
        </div>
      </div>
    </div>
  );
}
