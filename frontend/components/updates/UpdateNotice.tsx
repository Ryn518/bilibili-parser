'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SEEN_KEY = 'bili-planner-seen-update';

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
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/updates?latest=1')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || json.code !== 0 || !json.data?.id) return;
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
      <div className={`modal ${item.images?.[0] ? 'max-w-[520px]' : 'max-w-[420px]'}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-accent-text">网站更新了 · {item.version}</p>
        <h3 className="mt-1 text-lg font-bold text-ink">{item.title}</h3>
        {item.content ? (
          <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-text2">{item.content}</p>
        ) : null}
        {item.images?.[0] ? (
          <button type="button" onClick={() => setViewing(item.images?.[0] || null)} className="mt-3 block w-full overflow-hidden rounded-2xl border border-border bg-[#F7F9FC] text-left">
            <img src={item.images[0]} alt="更新配图" className="max-h-56 w-full object-contain object-top" />
          </button>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={close} className="flex-1 rounded-[10px] border border-border py-2.5 text-sm font-semibold text-text2">
            知道了
          </button>
          <button
            type="button"
            className="btn-accent flex-1"
            onClick={() => {
              localStorage.setItem(SEEN_KEY, item.id);
              setItem(null);
              router.push(`/updates#update-${item.id}`);
            }}
          >
            去看看并评论
          </button>
        </div>
      </div>
      {viewing && (
        <div className="modal-overlay bg-black/70" style={{ zIndex: 170 }} onClick={() => setViewing(null)}>
          <img src={viewing} alt="更新配图" className="max-h-[88vh] max-w-[min(1100px,94vw)] rounded-2xl bg-white object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
