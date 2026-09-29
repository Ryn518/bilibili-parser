'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface UpdateComment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
}

interface SiteUpdate {
  id: string;
  version: string;
  title: string;
  content: string;
  createdAt: string;
  comments: UpdateComment[];
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UpdatesPage() {
  const auth = useAuth();
  const showToast = useToast();
  const [items, setItems] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [guestName, setGuestName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/updates');
    const json = await res.json();
    if (res.ok && json.code === 0) setItems(json.data || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const publish = async () => {
    if (!auth.session?.token) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.session.token}`
        },
        body: JSON.stringify({ version, title, content: body })
      });
      const json = await res.json();
      if (!res.ok || json.code !== 0) throw new Error(json.message || '发布失败');
      if (json.data?.id) localStorage.setItem('bili-planner-seen-update', json.data.id);
      setVersion('');
      setTitle('');
      setBody('');
      showToast('更新已发布，下次打开网站的人会看到弹窗');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const comment = async (updateId: string) => {
    const text = (drafts[updateId] || '').trim();
    if (!text) {
      showToast('请填写评论');
      return;
    }
    const res = await fetch('/api/updates/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth.session?.token ? { Authorization: `Bearer ${auth.session.token}` } : {})
      },
      body: JSON.stringify({ updateId, content: text, username: auth.session?.username || guestName })
    });
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '评论失败');
      return;
    }
    setDrafts((prev) => ({ ...prev, [updateId]: '' }));
    showToast('评论已发布');
    await load();
  };

  const removeUpdate = async (id: string) => {
    if (!auth.session?.token) return;
    const res = await fetch(`/api/updates?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.session.token}` }
    });
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '删除失败');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const removeComment = async (updateId: string, commentId: string) => {
    if (!auth.session?.token) return;
    const res = await fetch(
      `/api/updates/comment?updateId=${encodeURIComponent(updateId)}&commentId=${encodeURIComponent(commentId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${auth.session.token}` } }
    );
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '删除失败');
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-6">
      <div className="min-h-[calc(100dvh-11rem)] rounded-[28px] bg-white px-5 py-5 shadow-[0_10px_32px_rgba(30,64,175,0.06)] sm:px-6">
      <h1 className="text-lg font-bold text-ink">更新</h1>
      <p className="mt-1 text-sm leading-relaxed text-text3">这里记录网站改了什么。发布新更新后，大家再次打开网站时会看到提醒，也可以在这里评论。</p>

      {auth.isAdmin && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-ink">发布一条更新</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="版本，如 v2.3.0"
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="这次做了哪些改动"
            className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={publish} disabled={publishing} className="btn-accent">
              {publishing ? '发布中…' : '发布更新'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-text2">加载中…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-text2">还没有更新记录。</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.id} id={`update-${item.id}`} className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-accent-text">{item.version}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{item.title}</h2>
                  <p className="text-[0.7rem] text-text3">{formatTime(item.createdAt)}</p>
                </div>
                {auth.isAdmin && (
                  <button type="button" onClick={() => removeUpdate(item.id)} className="text-xs text-red-500 hover:underline">
                    删除
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text2">{item.content}</p>

              <div className="mt-4 max-w-[420px] space-y-2 border-t border-border/70 pt-3">
                {item.comments.map((row) => (
                  <div key={row.id} className="rounded-xl bg-surface2 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">
                        {row.username}
                        <span className="ml-2 font-normal text-text3">{formatTime(row.createdAt)}</span>
                      </p>
                      {auth.isAdmin && (
                        <button type="button" onClick={() => removeComment(item.id, row.id)} className="text-[0.7rem] text-red-500 hover:underline">
                          删除
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text2">{row.content}</p>
                  </div>
                ))}
                {!auth.session && (
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="怎么称呼你（选填）"
                    className="w-full rounded-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    value={drafts[item.id] || ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="对这次更新说点什么"
                    className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <button type="button" onClick={() => comment(item.id)} className="shrink-0 rounded-full border border-border px-3 text-xs font-semibold text-text2">
                    评论
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
