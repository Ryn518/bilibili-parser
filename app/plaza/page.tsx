'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDraftState } from '@/hooks/useDraftState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';
import { FeedBoard } from '@/components/feed/FeedBoard';
import { dateKey } from '@/lib/date-key';

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
  images?: string[];
}

const MAX_IMAGES = 4;

function filesFromClipboard(data: DataTransfer) {
  const fromFiles = Array.from(data.files).filter((file) => file.type.startsWith('image/'));
  if (fromFiles.length) return fromFiles;
  const picked: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) picked.push(file);
    }
  }
  return picked;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('这张图片读不了'));
    reader.readAsDataURL(file);
  });
}

function prepareImage(file: File) {
  const keepOriginal = file.size <= 2_400_000 && (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/jpeg');
  if (keepOriginal) return fileToDataUrl(file);
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1920 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('图片处理失败'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('这张图片读不了'));
    };
    img.src = url;
  });
}

function ImagePager({ images, onOpen }: { images: string[]; onOpen: (src: string) => void }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const multiple = images.length > 1;
  const turn = (step: number) => setIndex((value) => (value + step + images.length) % images.length);

  return (
    <div className="relative mt-3 max-w-[560px] overflow-hidden rounded-2xl border border-border bg-[#F7F9FC]">
      <button type="button" onClick={() => onOpen(current)} className="block w-full">
        <img src={current} alt="帖子配图" className="h-72 w-full object-contain" />
      </button>
      {multiple && (
        <>
          <button
            type="button"
            aria-label="上一张"
            onClick={() => turn(-1)}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={() => turn(1)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm hover:bg-white"
          >
            ›
          </button>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.68rem] font-medium text-text2 shadow-sm">
            {Math.min(index, images.length - 1) + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
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
  const [content, setContent] = useDraftState('plaza-content', '');
  const [images, setImages] = useDraftState<string[]>('plaza-images', [], false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [drafts, setDrafts] = useDraftState<Record<string, string>>('plaza-comments', {});
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');

  const markedDays = useMemo(() => new Set(posts.map((post) => dateKey(post.createdAt)).filter(Boolean)), [posts]);
  const visiblePosts = useMemo(
    () => (selectedDay === 'all' ? posts : posts.filter((post) => dateKey(post.createdAt) === selectedDay)),
    [posts, selectedDay]
  );

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

  const addImages = async (files: File[]) => {
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      showToast(`最多粘贴 ${MAX_IMAGES} 张图片`);
      return;
    }
    const next = files.slice(0, room);
    if (files.length > room) showToast(`最多粘贴 ${MAX_IMAGES} 张图片`);
    try {
      const urls = await Promise.all(next.map(prepareImage));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '图片处理失败');
    }
  };

  const publish = async () => {
    if (!auth.session?.token) {
      openAuth('login');
      return;
    }
    if (!content.trim() && images.length === 0) {
      showToast('请先写点内容，或粘贴一张图片');
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
        body: JSON.stringify({ content, images })
      });
      const json = await res.json();
      if (!res.ok || json.code !== 0) throw new Error(json.message || '发布失败');
      setContent('');
      setImages([]);
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
    <>
    <FeedBoard
      eyebrow="COMMUNITY BOARD"
      title="广场"
      subtitle="使用感受 · 功能建议 · 大家一起说"
      queryLabel="根据指定日期查看广场"
      selected={selectedDay}
      onSelect={setSelectedDay}
      marked={markedDays}
      toolbar={
        <div className="rounded-[22px] bg-white p-3 shadow-[0_8px_24px_rgba(30,64,175,0.06)] sm:p-4">
          <div className="rounded-[22px] bg-[#E6EDF6] p-3 sm:p-4">
            <div className="flex gap-3">
              <Avatar name={auth.session?.username || '访'} />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={(event) => {
                  const files = filesFromClipboard(event.clipboardData);
                  if (!files.length) return;
                  event.preventDefault();
                  void addImages(files);
                }}
                placeholder="写一条建议或想法，也可以直接粘贴图片…"
                className="min-h-[72px] flex-1 resize-y bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-text3"
              />
            </div>
            {images.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pl-[52px]">
                {images.map((src, index) => (
                  <div key={src.slice(0, 32) + index} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white bg-white">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-white/90 px-1.5 text-[0.65rem] font-semibold text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-3 pl-[52px]">
              <span className="text-xs text-text3">Ctrl+V 粘贴图片，多张可以翻页看，最多 {MAX_IMAGES} 张</span>
              <button type="button" onClick={publish} disabled={submitting} className="btn-accent min-w-[84px]">
                {submitting ? '发布中…' : '发布'}
              </button>
            </div>
          </div>
        </div>
      }
    >
        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-text3">加载中…</p>
        ) : visiblePosts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text3">
            {selectedDay === 'all' ? '还没有帖子，来发第一条吧。' : '这一天还没有广场帖子。'}
          </p>
        ) : (
          <ul>
            {visiblePosts.map((post) => {
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
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                message: '确定删除这条帖子吗？帖子和评论会一起去掉。',
                                run: () => removePost(post.id)
                              })
                            }
                            className="text-xs text-red-400 hover:text-red-500"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      {post.content ? (
                        <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-7 text-ink">{post.content}</p>
                      ) : null}
                      {!!post.images?.length && <ImagePager images={post.images} onOpen={setViewing} />}
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
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingDelete({
                                        message: '确定删除这条评论吗？',
                                        run: () => removeComment(post.id, item.id)
                                      })
                                    }
                                    className="text-[0.7rem] text-red-400 hover:text-red-500"
                                  >
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
    </FeedBoard>
      <ConfirmDialog
        open={!!pendingDelete}
        message={pendingDelete?.message || ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const job = pendingDelete?.run;
          setPendingDelete(null);
          void job?.();
        }}
      />
      {viewing && (
        <div className="modal-overlay bg-black/70" style={{ zIndex: 160 }} onClick={() => setViewing(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={viewing} alt="帖子配图" className="max-h-[88vh] max-w-[min(1100px,94vw)] rounded-2xl bg-white object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="absolute -top-3 right-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
