'use client';

import { useState } from 'react';
import { parsePasteInput } from '@/lib/bvid';
import { usePlan } from '@/components/plan/PlanPage';

interface Props {
  continueCache: { title: string; bvid: string } | null;
  onContinue: () => void;
  onDismissContinue: () => void;
  initialUrl?: string;
}

export function LandingHero({ continueCache, onContinue, onDismissContinue, initialUrl = '' }: Props) {
  const { dailyMinutes, setDailyMinutes, startPlanning, loading } = usePlan();
  const [url, setUrl] = useState(initialUrl);
  const [hint, setHint] = useState('');

  const updateHint = (raw: string) => {
    if (!raw.trim()) {
      setHint('');
      return;
    }
    const { videoId, hintTitle } = parsePasteInput(raw);
    if (videoId && typeof videoId === 'string') {
      setHint(`✓ 已识别：${videoId}${hintTitle ? ` · ${hintTitle.slice(0, 24)}` : ''}`);
    } else {
      setHint('⚠ 未识别到 BV 号，请确认含 bilibili.com/video/BV…');
    }
  };

  return (
    <section className="mx-auto max-w-[760px] py-12 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text2">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(5,150,105,0.12)]" />
        登录后规划 · 免费 3 次/月 · VIP 无限
      </div>
      <h1 className="mb-3.5 text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
        万能课表规划器，<span className="text-accent-text">一键生成</span>
      </h1>
      <p className="mx-auto mb-7 max-w-xl text-base leading-relaxed text-text2">
        粘贴 B 站课程链接，智能解析分 P 时长，按每日学习量自动切分日程
      </p>

      {continueCache && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5 rounded-[10px] border border-accent/25 bg-accent-light px-4 py-2.5 text-sm">
          <span>
            📂 上次规划：<strong className="text-accent-text">{continueCache.title.slice(0, 30)}</strong>
          </span>
          <button type="button" onClick={onContinue} className="rounded-full bg-gradient-to-br from-accent to-accent-deep px-3.5 py-1.5 text-xs font-semibold text-white">
            继续学习
          </button>
          <button type="button" onClick={onDismissContinue} className="text-xs text-text3 hover:text-text2">
            忽略
          </button>
        </div>
      )}

      <div className="mb-2 flex items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-lg">
        <span className="pl-3 text-base text-text3">🔗</span>
        <input
          className="min-w-0 flex-1 border-none bg-transparent px-2 py-3 text-sm outline-none"
          placeholder="粘贴 B 站课程链接或分享文字…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            updateHint(e.target.value);
          }}
        />
        <button type="button" disabled={loading} onClick={() => startPlanning(url)} className="search-btn shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">
          开始规划
        </button>
      </div>
      {hint && <p className={`mb-2 pl-4 text-left text-xs ${hint.startsWith('⚠') ? 'text-amber-600' : 'text-text2'}`}>{hint}</p>}

      <div className="mt-4 inline-flex items-center gap-2 text-sm text-text2">
        <label>每天学习</label>
        <input
          type="number"
          min={10}
          max={480}
          value={dailyMinutes}
          onChange={(e) => setDailyMinutes(Math.max(10, Math.min(480, Number(e.target.value) || 45)))}
          className="w-16 rounded-lg border border-border px-2 py-1.5 text-center"
        />
        <span>分钟</span>
      </div>
    </section>
  );
}
