'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDraftState } from '@/hooks/useDraftState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { FeedBoard } from '@/components/feed/FeedBoard';
import { dateKey } from '@/lib/date-key';

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

function compressImage(file: File) {
  const keepOriginal = file.size <= 2_400_000 && (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/jpeg');
  if (keepOriginal) return fileToDataUrl(file);

  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxW = 1920;
      const scale = Math.min(1, maxW / img.width);
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
  const [version, setVersion] = useDraftState('updates-version', '');
  const [title, setTitle] = useDraftState('updates-title', '');
  const [body, setBody] = useDraftState('updates-body', '');
  const [images, setImages] = useDraftState<string[]>('updates-images', [], false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [guestName, setGuestName] = useDraftState('updates-guest', '');
  const [drafts, setDrafts] = useDraftState<Record<string, string>>('updates-comments', {});
  const [publishing, setPublishing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');

  const markedDays = useMemo(() => new Set(items.map((item) => dateKey(item.createdAt)).filter(Boolean)), [items]);
  const visibleItems = useMemo(
    () => (selectedDay === 'all' ? items : items.filter((item) => dateKey(item.createdAt) === selectedDay)),
    [items, selectedDay]
  );

  const load = useCallback(async () => {
    const res = await fetch('/api/updates');
    const json = await res.json();
    if (res.ok && json.code === 0) setItems(json.data || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

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
      const urls = await Promise.all(next.map(compressImage));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '图片处理失败');
    }
  };

  const onPasteImages = (event: React.ClipboardEvent) => {
    const files = filesFromClipboard(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    void addImages(files);
  };

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
        body: JSON.stringify({ version, title, content: body, images })
      });
      const json = await res.json();
      if (!res.ok || json.code !== 0) throw new Error(json.message || '发布失败');
      setVersion('');
      setTitle('');
      setBody('');
      setImages([]);
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
    <>
    <FeedBoard
      eyebrow="TODAY TOP NEWS"
      title="站点更新"
      subtitle="版本记录 · 功能进展 · 当天速览"
      queryLabel="根据指定日期查看更新"
      selected={selectedDay}
      onSelect={setSelectedDay}
      marked={markedDays}
      toolbar={
        auth.isAdmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
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
            onPaste={onPasteImages}
            placeholder="这次做了哪些改动。也可以在这里直接粘贴截图"
            className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-text2 hover:border-accent hover:text-accent-text">
              添加图片
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  void addImages(files);
                }}
              />
            </label>
            <span className="text-xs text-text3">在输入框里 Ctrl+V 粘贴截图，最多 {MAX_IMAGES} 张</span>
          </div>
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((src, index) => (
                <div key={src.slice(0, 48) + index} className="relative overflow-hidden rounded-xl border border-border bg-white">
                  <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.68rem] font-semibold text-red-500 shadow"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={publish} disabled={publishing} className="btn-accent">
              {publishing ? '发布中…' : '发布更新'}
            </button>
          </div>
        </div>
        ) : null
      }
    >
      {loading ? (
        <p className="py-10 text-center text-text2">加载中…</p>
      ) : visibleItems.length === 0 ? (
        <p className="py-10 text-center text-text2">
          {selectedDay === 'all' ? '还没有更新记录。' : '这一天还没有更新。'}
        </p>
      ) : (
        <ul className="space-y-4 p-4 sm:p-5">
          {visibleItems.map((item) => (
            <li key={item.id} id={`update-${item.id}`} className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
              <div className={`grid items-stretch gap-3 ${item.images?.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(360px,44%)]' : ''}`}>
              <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-accent-text">{item.version}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{item.title}</h2>
                  <p className="text-[0.7rem] text-text3">{formatTime(item.createdAt)}</p>
                </div>
                {auth.isAdmin && !item.images?.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({
                        message: '确定删除这条更新吗？配图和评论会一起去掉。',
                        run: () => removeUpdate(item.id)
                      })
                    }
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                )}
              </div>
              {item.content ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text2">{item.content}</p>
              ) : null}

              <div className={`${item.content ? 'mt-4' : ''} max-w-[420px] space-y-2 border-t border-border/70 pt-3 max-md:max-w-none`}>
                {item.comments.map((row) => (
                  <div key={row.id} className="rounded-xl bg-surface2 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">
                        {row.username}
                        <span className="ml-2 font-normal text-text3">{formatTime(row.createdAt)}</span>
                      </p>
                      {auth.isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              message: '确定删除这条评论吗？',
                              run: () => removeComment(item.id, row.id)
                            })
                          }
                          className="text-[0.7rem] text-red-500 hover:underline"
                        >
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
                    className="w-full rounded-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent max-md:rounded-xl max-md:py-3 max-md:text-base"
                  />
                )}
                <div className="flex gap-2 max-md:flex-col">
                  <input
                    value={drafts[item.id] || ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="对这次更新说点什么"
                    className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent max-md:rounded-xl max-md:py-3 max-md:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => comment(item.id)}
                    className="shrink-0 rounded-full border border-border px-3 text-xs font-semibold text-text2 max-md:h-11 max-md:w-full max-md:rounded-xl max-md:text-sm"
                  >
                    评论
                  </button>
                </div>
              </div>
              </div>
              {!!item.images?.length && (
                <div className="relative grid h-full min-h-[260px] gap-2 pr-12 max-md:min-h-0 max-md:pr-0">
                  {auth.isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          message: '确定删除这条更新吗？配图和评论会一起去掉。',
                          run: () => removeUpdate(item.id)
                        })
                      }
                      className="absolute right-0 top-0 text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  )}
                  {item.images.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setViewing(src)}
                      className="relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-border bg-[#F7F9FC] text-left transition hover:border-accent/40 max-md:min-h-0"
                    >
                      <img
                        src={src}
                        alt="更新配图"
                        className="absolute inset-x-0 top-0 h-[calc(100%-1.75rem)] w-full object-contain object-left max-md:static max-md:mx-auto max-md:h-auto max-md:max-h-[min(52vh,22rem)]"
                      />
                      <span className="absolute inset-x-0 bottom-0 py-1.5 text-center text-[0.68rem] text-text3 max-md:static max-md:block max-md:border-t max-md:border-border/60">
                        点击放大
                      </span>
                    </button>
                  ))}
                </div>
              )}
              </div>
            </li>
          ))}
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
        <div className="modal-overlay bg-black/70 max-md:p-3" style={{ zIndex: 160 }} onClick={() => setViewing(null)}>
          <div className="relative max-md:w-full max-md:max-w-[min(100%,1100px)]" onClick={(e) => e.stopPropagation()}>
            <img src={viewing} alt="更新配图" className="max-h-[88vh] max-w-[min(1100px,94vw)] rounded-2xl bg-white object-contain shadow-2xl max-md:max-h-[80dvh] max-md:w-full max-md:max-w-none" />
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="absolute -top-3 right-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow sm:-right-3 max-md:right-2 max-md:top-2 max-md:sm:right-2"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
