'use client';

import { useEffect, useState } from 'react';
import { parsePasteInput } from '@/lib/bvid';
import { clampDailyMinutes } from '@/lib/planner';
import { usePlan } from '@/components/plan/PlanPage';
import { PlanSettingsRow, type PlanInputMode } from '@/components/plan/PlanSettingsRow';
import { useToast } from '@/hooks/useToast';

interface Props {
  continueCache: { title: string; bvid: string } | null;
  onContinue: () => void;
  onDismissContinue: () => void;
}

export function LandingHero({ continueCache, onContinue, onDismissContinue }: Props) {
  const {
    dailyMinutes,
    setDailyMinutes,
    playbackSpeed,
    setPlaybackSpeed,
    targetDays,
    startPlanning,
    loading
  } = usePlan();
  const showToast = useToast();
  const [url, setUrl] = useState('');
  const [hint, setHint] = useState('');
  const [dailyDraft, setDailyDraft] = useState(String(dailyMinutes));
  const [daysDraft, setDaysDraft] = useState(targetDays ? String(targetDays) : '');
  const [mode, setMode] = useState<PlanInputMode>(targetDays ? 'days' : 'daily');

  useEffect(() => {
    setDailyDraft(String(dailyMinutes));
  }, [dailyMinutes]);

  useEffect(() => {
    setDaysDraft(targetDays ? String(targetDays) : '');
    if (targetDays) setMode('days');
  }, [targetDays]);

  const commitDaily = () => {
    const next = clampDailyMinutes(Number(dailyDraft));
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
    if (mode === 'days') {
      const days = Number(daysDraft);
      if (!daysDraft.trim() || !Number.isFinite(days) || days <= 0) {
        showToast('请填写想几天学完，或改选每天学习分钟');
        return;
      }
      startPlanning(url, {
        dailyMinutes,
        targetDays: days,
        playbackSpeed
      });
      return;
    }
    const nextDaily = commitDaily();
    startPlanning(url, {
      dailyMinutes: nextDaily,
      targetDays: null,
      playbackSpeed
    });
  };

  return (
    <section className="mx-auto max-w-[760px] py-12 text-center max-md:px-1 max-md:py-8">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text2 max-md:mb-4 max-md:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(5,150,105,0.12)]" />
        完全免费 · 粘贴即规划 · 登录可保存课程
      </div>
      <h1 className="mb-3.5 text-4xl font-extrabold tracking-tight text-ink max-md:mb-2.5 max-md:text-[1.75rem] max-md:leading-tight md:text-5xl">
        万能课表规划器，<span className="text-accent-text">一键生成</span>
      </h1>
      <p className="mx-auto mb-7 max-w-xl text-base leading-relaxed text-text2 max-md:mb-5 max-md:text-sm">
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

      <div className="mb-2 flex items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-lg max-md:flex-col max-md:gap-2.5 max-md:rounded-2xl max-md:p-3">
        <div className="flex w-full min-w-0 items-center gap-1 max-md:gap-0">
          <span className="pl-3 text-base text-text3 max-md:pl-1">🔗</span>
          <input
            className="min-w-0 flex-1 border-none bg-transparent px-2 py-3 text-sm outline-none max-md:py-2.5"
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
            className="search-btn shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50 max-md:hidden"
          >
            {loading ? '规划中…' : '开始规划'}
          </button>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="search-btn hidden w-full rounded-xl bg-gradient-to-br from-accent to-accent-deep py-3 text-sm font-semibold text-white shadow disabled:opacity-50 max-md:inline-flex max-md:justify-center"
        >
          {loading ? '规划中…' : '开始规划'}
        </button>
      </div>
      {hint && (
        <p className={`mb-2 pl-4 text-left text-xs ${hint.startsWith('⚠') ? 'text-amber-600' : 'text-text2'}`}>
          {hint}
        </p>
      )}

      <PlanSettingsRow
        mode={mode}
        onModeChange={setMode}
        dailyDraft={dailyDraft}
        onDailyDraftChange={setDailyDraft}
        onDailyCommit={commitDaily}
        daysDraft={daysDraft}
        onDaysDraftChange={setDaysDraft}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={setPlaybackSpeed}
        radioName="landing-plan-mode"
      />
    </section>
  );
}
