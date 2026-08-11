'use client';

import { useEffect, useState } from 'react';
import { parsePasteInput } from '@/lib/bvid';
import { usePlan } from '@/components/plan/PlanPage';

interface Props {
  continueCache: { title: string; bvid: string } | null;
  onContinue: () => void;
  onDismissContinue: () => void;
}

function clampDaily(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 45;
  return Math.max(10, Math.min(480, Math.round(n)));
}

export function LandingHero({ continueCache, onContinue, onDismissContinue }: Props) {
  const { dailyMinutes, setDailyMinutes, startPlanning, loading } = usePlan();
  const [url, setUrl] = useState('');
  const [hint, setHint] = useState('');
  const [dailyDraft, setDailyDraft] = useState(String(dailyMinutes));

  useEffect(() => {
    setDailyDraft(String(dailyMinutes));
  }, [dailyMinutes]);

  const commitDaily = () => {
    const next = clampDaily(Number(dailyDraft));
    setDailyMinutes(next);
    setDailyDraft(String(next));
    return next;
  };

  const updateHint = (raw: string) => {
    if (!raw.trim()) {
      setHint('');
      return;
    }
    const { videoId, hintTitle } = parsePasteInput(raw);
    if (videoId && typeof videoId === 'string') {
      setHint(`✓ 已识别：${videoId}${hintTitle ? ` · ${hintTitle.slice(0, 24)}` : ''}`);
    } else if (videoId && typeof videoId === 'object' && 'aid' in videoId) {
      setHint(`✓ 已识别：av${videoId.aid}`);
    } else if (videoId && typeof videoId === 'object' && 'shortUrl' in videoId) {
      setHint('✓ 已识别短链，点击开始规划将自动展开');
    } else {
      setHint('⚠ 未识别到 BV 号，请确认含 bilibili.com/video/BV…');
    }
  };

  const submit = () => {
    if (loading) return;
    commitDaily();
    startPlanning(url);
  };

  return (
    <section className="mx-auto max-w-[760px] px-1 py-6 text-center sm:px-0 sm:py-12">
      <div className="mb-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text2 sm:mb-6 sm:gap-2 sm:px-3.5 sm:text-xs">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(5,150,105,0.12)]" />
        <span className="sm:hidden">免费 · 粘贴即规划</span>
        <span className="hidden sm:inline">完全免费 · 粘贴即规划 · 登录可保存课程</span>
      </div>
      <h1 className="mb-2.5 text-[1.65rem] font-extrabold leading-tight tracking-tight text-ink sm:mb-3.5 sm:text-4xl md:text-5xl">
        万能课表规划器，
        <br className="sm:hidden" />
        <span className="text-accent-text">一键生成</span>
      </h1>
      <p className="mx-auto mb-5 max-w-xl px-1 text-sm leading-relaxed text-text2 sm:mb-7 sm:text-base">
        粘贴 B 站课程链接，智能解析分 P 时长，按每日学习量自动切分日程
      </p>

      {continueCache && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5 rounded-[10px] border border-accent/25 bg-accent-light px-4 py-2.5 text-sm">
          <span>
            📂 上次规划：<strong className="text-accent-text">{continueCache.title.slice(0, 30)}</strong>
          </span>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full bg-gradient-to-br from-accent to-accent-deep px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            继续学习
          </button>
          <button type="button" onClick={onDismissContinue} className="text-xs text-text3 hover:text-text2">
            忽略
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-3 shadow-lg sm:rounded-full sm:p-1.5">
        <div className="flex items-center gap-1 sm:gap-0">
          <span className="shrink-0 pl-1 text-base text-text3 sm:pl-3">🔗</span>
          <input
            className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-sm outline-none sm:py-3"
            placeholder="粘贴 B 站课程链接或分享文字…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              updateHint(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="search-btn hidden shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50 sm:inline-flex"
          >
            {loading ? '规划中…' : '开始规划'}
          </button>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="search-btn mt-2.5 w-full rounded-xl bg-gradient-to-br from-accent to-accent-deep py-3 text-sm font-semibold text-white shadow disabled:opacity-50 sm:hidden"
        >
          {loading ? '规划中…' : '开始规划'}
        </button>
      </div>
      {hint && (
        <p className={`mb-1 mt-2 px-1 text-left text-xs sm:mb-2 sm:pl-4 ${hint.startsWith('⚠') ? 'text-amber-600' : 'text-text2'}`}>
          {hint}
        </p>
      )}

      <div className="mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface/90 px-4 py-3 text-sm text-text2 shadow-sm sm:mt-4 sm:inline-flex sm:w-auto sm:rounded-full sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
        <label htmlFor="dailyMinInput">每天学习</label>
        <input
          id="dailyMinInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={dailyDraft}
          onChange={(e) => setDailyDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commitDaily}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDaily();
            }
          }}
          className="daily-min-input w-16 rounded-lg border border-border bg-white px-2 py-2 text-center text-base font-semibold text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-[72px] sm:py-1.5 sm:text-sm sm:font-normal"
          aria-label="每天学习分钟数，可直接输入"
        />
        <span>分钟</span>
        <span className="hidden text-xs text-text3 sm:inline">（10–480，可直接键盘输入）</span>
      </div>
    </section>
  );
}
