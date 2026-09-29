'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';

interface PlazaComment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
}

interface PlazaPost {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  comments: PlazaComment[];
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const hm = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (date.toDateString() === now.toDateString()) return `今天 ${hm}`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${hm}`;
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] font-semibold text-accent-text ${
        small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
      }`}
    >
      {(name || '访').slice(0, 1).toUpperCase()}
    </span>
  );
}

function LikeChip({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        liked ? 'bg-accent text-white shadow-sm' : 'bg-[#E6EDF6] text-text3 hover:bg-accent-light hover:text-accent-text'
      }`}
    >
      赞 {count}
    </button>
  );
}

export default function PlazaPage() {
  const auth = useAuth();
  const showToast = useToast();
  const { openAuth } = useUiStore();
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!auth.session?.token) {
      setPosts([]);
      return;
    }
    const res = await fetch('/api/plaza', {
      headers: { Authorization: `Bearer ${auth.session.token}` }
    });
    const json = await res.json();
    if (res.ok && json.code === 0) setPosts(json.data || []);
  }, [auth.session?.token]);

  useEffect(() => {
    if (auth.loading) return;
    load().finally(() => setLoading(false));
  }, [auth.loading, load]);

  const publish = async () => {
    if (!auth.session?.token) {
      openAuth('login');
      return;
    }
    if (!content.trim()) {
      showToast('请先写点内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/plaza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.session.token}`
        },
        body: JSON.stringify({ content })
      });
      const json = await res.json();
      if (!res.ok || json.code !== 0) throw new Error(json.message || '发布失败');
      setContent('');
      showToast('已发布');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const like = async (postId: string, commentId?: string) => {
    if (!auth.session?.token) {
      openAuth('login');
      return;
    }
    const res = await fetch('/api/plaza/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({ postId, commentId })
    });
    const json = await res.json();
    if (res.ok && json.code === 0 && json.data) {
      setPosts((prev) => prev.map((item) => (item.id === postId ? json.data : item)));
    } else {
      showToast(json.message || '点赞失败');
    }
  };

  const comment = async (postId: string) => {
    if (!auth.session?.token) {
      openAuth('login');
      return;
    }
    const text = (drafts[postId] || '').trim();
    if (!text) {
      showToast('请填写评论');
      return;
    }
    const res = await fetch('/api/plaza/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({ postId, content: text })
    });
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '评论失败');
      return;
    }
    setDrafts((prev) => ({ ...prev, [postId]: '' }));
    showToast('评论已发布');
    setOpenId(postId);
    await load();
  };

  const removePost = async (id: string) => {
    if (!auth.session?.token) return;
    const res = await fetch(`/api/plaza?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.session.token}` }
    });
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '删除失败');
      return;
    }
    setPosts((prev) => prev.filter((item) => item.id !== id));
  };

  const removeComment = async (postId: string, commentId: string) => {
    if (!auth.session?.token) return;
    const res = await fetch(
      `/api/plaza/comment?postId=${encodeURIComponent(postId)}&commentId=${encodeURIComponent(commentId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${auth.session.token}` } }
    );
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      showToast(json.message || '删除失败');
      return;
    }
    await load();
  };

  if (auth.loading) {
    return <p className="py-20 text-center text-text2">加载中…</p>;
  }

  if (!auth.session) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-16">
        <div className="rounded-[28px] bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(37,99,235,0.08)]">
          <h1 className="text-2xl font-bold text-ink">广场</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text2">
            这里是大家的建议和讨论。登录后即可查看、发布、评论和点赞，不需要绑定手机号。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => openAuth('login')} className="btn-accent px-6">
              登录
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="rounded-full border border-border px-6 py-2 text-sm font-semibold text-text2"
            >
              注册
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-6">
      <div className="min-h-[calc(100dvh-11rem)] overflow-hidden rounded-[28px] bg-white shadow-[0_10px_32px_rgba(30,64,175,0.06)]">
        <div className="px-5 pb-2 pt-5 sm:px-6">
          <h1 className="text-lg font-bold text-ink">广场</h1>
          <p className="mt-1 text-sm text-text3">说说使用感受，或提出你希望加上的功能。</p>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <div className="rounded-[22px] bg-[#E6EDF6] p-3 sm:p-4">
            <div className="flex gap-3">
              <Avatar name={auth.session.username} />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写一条建议或想法…"
                className="min-h-[72px] flex-1 resize-y bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-text3"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={publish} disabled={submitting} className="btn-accent min-w-[84px]">
                {submitting ? '发布中…' : '发布'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-text3">加载中…</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text3">还没有帖子，来发第一条吧。</p>
        ) : (
          <ul>
            {posts.map((post) => {
              const opened = openId === post.id;
              return (
                <li key={post.id} className="border-t border-[#E6EDF5] px-5 py-5 sm:px-6">
                  <div className="flex gap-3">
                    <Avatar name={post.username} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{post.username}</p>
                          <p className="text-xs text-text3">{formatTime(post.createdAt)}</p>
                        </div>
                        {auth.isAdmin && (
                          <button type="button" onClick={() => removePost(post.id)} className="text-xs text-red-400 hover:text-red-500">
                            删除
                          </button>
                        )}
                      </div>
                      <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-7 text-ink">{post.content}</p>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenId(opened ? null : post.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            opened ? 'bg-accent-light text-accent-text' : 'bg-[#E6EDF6] text-text3 hover:text-accent-text'
                          }`}
                        >
                          评论 {post.comments.length}
                        </button>
                        <LikeChip liked={post.liked} count={post.likeCount} onClick={() => like(post.id)} />
                      </div>

                      {opened && (
                        <div className="mt-4 space-y-3">
                          {post.comments.map((item) => (
                            <div key={item.id} className="rounded-[18px] bg-[#E6EDF6] px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-ink">
                                  {item.username}
                                  <span className="ml-2 font-normal text-text3">{formatTime(item.createdAt)}</span>
                                </p>
                                {auth.isAdmin && (
                                  <button type="button" onClick={() => removeComment(post.id, item.id)} className="text-[0.7rem] text-red-400 hover:text-red-500">
                                    删除
                                  </button>
                                )}
                              </div>
                              <div className="mt-1.5 flex items-end justify-between gap-3">
                                <p className="whitespace-pre-wrap text-sm leading-6 text-text2">{item.content}</p>
                                <LikeChip liked={item.liked} count={item.likeCount || 0} onClick={() => like(post.id, item.id)} />
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-3 rounded-[22px] bg-[#E6EDF6] px-4 py-2.5">
                            <input
                              value={drafts[post.id] || ''}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="写下你的评论"
                              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-text3"
                            />
                            <button type="button" onClick={() => comment(post.id)} className="btn-accent shrink-0">
                              发布
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
