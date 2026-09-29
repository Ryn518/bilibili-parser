'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';

export function FeedbackFab() {
  const { feedbackOpen, openFeedback, closeFeedback, openTip } = useUiStore();
  const auth = useAuth();
  const showToast = useToast();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('请填写想说的话');
      return;
    }
    if (!contact.trim()) {
      showToast('请填写联系方式，方便我回复你');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contact, username: auth.session?.username })
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        showToast(data.message || '感谢反馈！');
        setMessage('');
        setContact('');
        closeFeedback();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[120] flex flex-col items-end gap-2.5">
        <button
          type="button"
          onClick={openTip}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-xs font-medium text-amber-900/80 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100/95"
        >
          请作者喝杯咖啡
        </button>
        <button
          type="button"
          onClick={openFeedback}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-4 py-2.5 text-xs font-medium text-text2 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-accent hover:text-accent-text"
        >
          <span>💬</span> 悄悄话
        </button>
      </div>
      {feedbackOpen && (
        <div className="modal-overlay" onClick={closeFeedback}>
          <div className="modal max-w-[400px] text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-center text-lg font-bold">悄悄话</h3>
            <p className="mb-4 text-center text-xs leading-relaxed text-text2">
              感受和建议可以发到广场，说不定有同感的朋友会回复你！但是有什么想单独对我说的，也可以在这里发送给我哦。
            </p>
            <form onSubmit={submit}>
              <label className="mb-1.5 block text-xs font-semibold text-text2">想说的话</label>
              <textarea
                className="mb-3 min-h-[100px] w-full resize-y rounded-[10px] border border-border bg-surface2 px-3 py-2.5 outline-none focus:border-accent"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <label className="mb-1.5 block text-xs font-semibold text-text2">联系方式</label>
              <input
                className="mb-4 w-full rounded-[10px] border border-border bg-surface2 px-3 py-2.5 outline-none focus:border-accent"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="留个邮箱，我才找得到你"
                required
              />
              <div className="flex gap-2.5">
                <button type="button" onClick={closeFeedback} className="flex-1 rounded-[10px] border border-border py-2.5 text-sm font-semibold text-text2">
                  取消
                </button>
                <button type="submit" disabled={submitting} className="btn-accent flex-1">
                  {submitting ? '发送中…' : '发送反馈'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
