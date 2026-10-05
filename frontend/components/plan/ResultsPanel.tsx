'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePlan } from '@/components/plan/PlanPage';
import { formatDuration } from '@/lib/format';
import { describePartDetail, getCatalogRange, clampDailyMinutes, studySeconds } from '@/lib/planner';
import { EpisodePicker } from '@/components/plan/EpisodePicker';
import { CardDownload } from '@/components/plan/CardDownload';
import { CoverImage } from '@/components/ui/CoverImage';
import { PlanSettingsRow, type PlanInputMode } from '@/components/plan/PlanSettingsRow';
import { useToast } from '@/hooks/useToast';

type Tab = 'overview' | 'today' | 'schedule' | 'extra';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'today', label: '今日', icon: '📍' },
  { id: 'schedule', label: '日程', icon: '📅' },
  { id: 'extra', label: '打卡', icon: '✨' }
];

export function ResultsPanel() {
  const {
    course,
    plan,
    progress,
    dailyMinutes,
    playbackSpeed,
    setPlaybackSpeed,
    targetDays,
    skippedIndexes,
    toggleSkippedEpisode,
    clearSkippedEpisodes,
    replanSchedule,
    toggleDayComplete,
    replan,
    backToHome
  } = usePlan();
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());
  const [dailyDraft, setDailyDraft] = useState(String(dailyMinutes));
  const [daysDraft, setDaysDraft] = useState(targetDays ? String(targetDays) : '');
  const [mode, setMode] = useState<PlanInputMode>(targetDays ? 'days' : 'daily');

  useEffect(() => {
    setDailyDraft(String(dailyMinutes));
  }, [dailyMinutes]);

  useEffect(() => {
    setDaysDraft(targetDays ? String(targetDays) : '');
    setMode(targetDays ? 'days' : 'daily');
  }, [targetDays]);

  useEffect(() => {
    if (selectedDayIdx !== null && selectedDayIdx >= plan.length) {
      setSelectedDayIdx(null);
    }
  }, [plan.length, selectedDayIdx]);

  const stats = useMemo(() => {
    const done = progress.completedDays?.length || 0;
    const total = plan.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct, remain: total - done };
  }, [plan.length, progress.completedDays]);

  const currentIdx = useMemo(
    () => plan.findIndex((d) => !progress.completedDays?.includes(d.day)),
    [plan, progress.completedDays]
  );

  const focusIdx = selectedDayIdx ?? (currentIdx >= 0 ? currentIdx : Math.max(0, plan.length - 1));
  const focusDay = plan[focusIdx];

  if (!course) return null;

  const skippedCount = skippedIndexes.length;
  const studyCount = Math.max(0, course.episodes.length - skippedCount);
  const shownSeconds = skippedCount ? studySeconds(course.episodes, skippedIndexes) : course.totalSeconds;

  const toggleExpand = (dayNum: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum);
      else next.add(dayNum);
      return next;
    });
  };

  const selectDay = (idx: number) => {
    setSelectedDayIdx(idx);
    setTab('today');
  };

  const handleReplanDaily = () => {
    if (mode === 'days') {
      const days = Number(daysDraft);
      if (!daysDraft.trim() || !Number.isFinite(days) || days <= 0) {
        showToast('请填写想几天学完，或改选每天学习分钟');
        return;
      }
      replanSchedule({
        dailyMinutes,
        playbackSpeed,
        targetDays: days
      });
      return;
    }
    const next = clampDailyMinutes(Number(dailyDraft));
    setDailyDraft(String(next));
    replanSchedule({
      dailyMinutes: next,
      playbackSpeed,
      targetDays: null
    });
  };

  return (
    <section className="animate-[resultsIn_0.4s_ease] py-6 md:py-9">
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-border2 pb-4">
        <button
          type="button"
          onClick={backToHome}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text2 shadow hover:border-accent hover:text-accent-text"
        >
          ← 返回首页
        </button>
        <span className="text-sm font-semibold text-text2">我的课表 · {course.title.slice(0, 36)}</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <CoverImage src={course.cover} wrapperClassName="aspect-video w-full" />
            <div className="p-4">
              <h2 className="line-clamp-2 text-sm font-bold leading-snug text-ink">{course.title}</h2>
              <p className="mt-1.5 text-xs text-text3">
                {formatDuration(shownSeconds)} · {skippedCount ? `学 ${studyCount}/${course.episodes.length}P` : `${course.episodes.length}P`} · 每天 {dailyMinutes} 分钟
                {playbackSpeed !== 1 ? ` · ${playbackSpeed}x` : ''}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-accent-light px-2 py-0.5 text-[0.68rem] font-semibold text-accent-text">
                  智能规划
                </span>
                <span className="rounded-md bg-surface2 px-2 py-0.5 text-[0.68rem] font-semibold text-accent-deep">
                  {plan.length} 天计划
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-3 shadow-card">
            <p className="mb-2 px-1 text-xs font-semibold text-text3">切换学习日</p>
            <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-0.5">
              {plan.map((d, idx) => {
                const done = progress.completedDays?.includes(d.day);
                const isCur = idx === focusIdx;
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => selectDay(idx)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      isCur
                        ? 'border-accent bg-accent-light shadow-sm'
                        : 'border-border2 bg-surface2 hover:border-accent/50 hover:bg-white'
                    } ${done ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink">
                        第 {d.day} 天 · {formatDuration(d.totalSec)}
                      </span>
                      {done && <span className="text-[0.65rem] text-green-600">✓</span>}
                    </div>
                    <p className="mt-0.5 text-[0.72rem] leading-snug text-accent-text">{d.pList.length} 个视频</p>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="px-1 text-[0.72rem] leading-relaxed text-text3">
            💡 点击左侧日程可切换「今日」视图；日程页点击条目可展开分 P 详情。
          </p>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="border-b border-border2 bg-surface2/80 p-2">
            <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface2 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition sm:px-4 ${
                    tab === t.id
                      ? 'bg-surface text-ink shadow-sm ring-1 ring-accent/25'
                      : 'text-text2 hover:text-ink'
                  }`}
                >
                  <span className="mr-1">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {tab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-medium text-text2">学习进度</span>
                    <span className="font-semibold text-accent-text">
                      {stats.pct}% · {stats.done}/{stats.total} 天
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-deep transition-all duration-500"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: stats.done, label: '已完成' },
                    { n: stats.remain, label: '剩余天' },
                    { n: `${stats.pct}%`, label: '总进度' }
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border2 bg-surface2 py-3 text-center">
                      <div className="text-xl font-bold text-ink">{s.n}</div>
                      <div className="mt-0.5 text-[0.68rem] text-text3">{s.label}</div>
                    </div>
                  ))}
                </div>
                {focusDay && (
                  <div className="rounded-xl border border-border2 bg-gradient-to-br from-accent-light/60 to-surface p-4">
                    <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-wide text-accent-text">当前学习</p>
                    <p className="text-sm font-bold text-ink">
                      第 {focusDay.day} 天 · {formatDuration(focusDay.totalSec)}
                    </p>
                    <p className="mt-1 text-[0.72rem] leading-snug text-accent-text">{focusDay.pList.length} 个视频</p>
                  </div>
                )}
                <EpisodePicker
                  episodes={course.episodes}
                  skippedIndexes={skippedIndexes}
                  onToggle={toggleSkippedEpisode}
                  onClear={clearSkippedEpisodes}
                />
                <div className="rounded-xl border border-dashed border-accent/35 bg-surface2/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">调整每日学习时长</p>
                    <span className="text-xs text-text3">不消耗规划次数</span>
                  </div>
                  <PlanSettingsRow
                    className="items-stretch sm:items-center"
                    mode={mode}
                    onModeChange={setMode}
                    dailyDraft={dailyDraft}
                    onDailyDraftChange={setDailyDraft}
                    onDailyCommit={() => setDailyDraft(String(clampDailyMinutes(Number(dailyDraft))))}
                    daysDraft={daysDraft}
                    onDaysDraftChange={setDaysDraft}
                    playbackSpeed={playbackSpeed}
                    onPlaybackSpeedChange={setPlaybackSpeed}
                    radioName="results-plan-mode"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleReplanDaily}
                      className="rounded-xl bg-gradient-to-br from-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95"
                    >
                      重新规划
                    </button>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-text3">
                    修改后会按新时长、倍速，以及还要学的视频重新切分日程，已打卡进度会尽量保留。
                  </p>
                </div>
              </div>
            )}

            {tab === 'today' && focusDay && (
              <div>
                <div className="mb-5 overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-light via-white to-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-accent-text">
                    {progress.completedDays?.includes(focusDay.day)
                      ? '✅ 本日已完成'
                      : `📍 第 ${focusDay.day} 天学习`}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-deep text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text3">今天任务</p>
                      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
                        {focusDay.pList.length} 个视频
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2">
                  {focusDay.pList.map((p, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-border2 bg-surface2 px-3 py-2.5 text-sm text-text"
                    >
                      {describePartDetail(p)}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => toggleDayComplete(focusDay.day)}
                  className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold transition ${
                    progress.completedDays?.includes(focusDay.day)
                      ? 'border border-border bg-surface2 text-text2'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow'
                  }`}
                >
                  {progress.completedDays?.includes(focusDay.day) ? '✓ 已完成，点击取消' : '✓ 标记本日学完'}
                </button>
              </div>
            )}

            {tab === 'schedule' && (
              <div>
                <div className="mb-3 flex items-center justify-between px-0.5">
                  <h3 className="text-sm font-semibold text-ink">全部日程</h3>
                  <span className="text-xs text-text3">共 {plan.length} 天</span>
                </div>
                <div className="max-h-[min(520px,60vh)] space-y-1 overflow-y-auto pr-1">
                  {plan.map((d, idx) => {
                    const done = progress.completedDays?.includes(d.day);
                    const isCur = idx === currentIdx;
                    const expanded = expandedDays.has(d.day);
                    const cat = getCatalogRange(d, course.episodes);
                    return (
                      <div key={d.day}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleExpand(d.day)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleExpand(d.day);
                            }
                          }}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                            isCur
                              ? 'border-accent bg-accent-light'
                              : 'border-border2 bg-surface2 hover:border-accent/50'
                          } ${done ? 'opacity-65' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDayComplete(d.day);
                            }}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[0.65rem] transition ${
                              done
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-border bg-surface text-transparent hover:border-accent'
                            }`}
                            aria-label={done ? '取消完成' : '标记完成'}
                          >
                            ✓
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-ink">
                              第 {d.day} 天{isCur ? ' · 当前' : ''} · 约 {formatDuration(d.totalSec)}
                            </div>
                            <div className="mt-0.5 text-[0.8rem] font-medium leading-snug text-accent-text">
                              {d.pList.length} 个视频
                            </div>
                            <p className="mt-0.5 text-[0.72rem] text-text3">{cat.sub}</p>
                          </div>
                          <span className={`mt-1 shrink-0 text-xs text-text3 transition ${expanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                        {expanded && (
                          <div className="mx-2 mb-1 rounded-b-xl border border-t-0 border-border2 bg-surface2/80 px-3 py-2 pl-10">
                            {d.pList.map((p, i) => (
                              <div
                                key={i}
                                className="border-b border-border2 py-2 text-[0.78rem] text-text2 last:border-0"
                              >
                                {describePartDetail(p)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === 'extra' && (
              <div>
                <p className="mb-4 text-sm leading-relaxed text-text2">
                  生成精美打卡图，分享到朋友圈记录学习进度。
                </p>
                <div className="flex flex-wrap gap-2">
                  <CardDownload />
                  <button
                    type="button"
                    onClick={replan}
                    className="rounded-full border border-border px-4 py-2 text-sm text-text2 hover:border-accent"
                  >
                    清空重来
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
