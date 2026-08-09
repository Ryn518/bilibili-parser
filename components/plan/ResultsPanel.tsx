'use client';

import { useState } from 'react';
import { usePlan } from '@/components/plan/PlanPage';
import { formatDuration } from '@/lib/format';
import { describePartDetail } from '@/lib/planner';
import { CardDownload } from '@/components/plan/CardDownload';

type Tab = 'overview' | 'today' | 'schedule';

export function ResultsPanel() {
  const { course, plan, progress, dailyMinutes, toggleDayComplete, replan, backToHome } = usePlan();
  const [tab, setTab] = useState<Tab>('overview');

  if (!course) return null;

  const done = progress.completedDays?.length || 0;
  const total = plan.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const currentIdx = plan.findIndex((d) => !progress.completedDays?.includes(d.day));
  const today = plan[currentIdx >= 0 ? currentIdx : plan.length - 1];

  return (
    <section className="animate-[resultsIn_0.4s_ease] py-9">
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-border2 pb-4">
        <button type="button" onClick={backToHome} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text2 shadow hover:border-accent hover:text-accent-text">
          ← 返回首页
        </button>
        <span className="text-sm font-semibold text-text2">规划结果 · {course.title.slice(0, 40)}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['overview', 'today', 'schedule'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-accent-light text-accent-text' : 'text-text2'}`}
          >
            {t === 'overview' ? '概览' : t === 'today' ? '今日' : '完整日程'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
            {course.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.cover} alt="" className="aspect-video w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-surface2 text-4xl">📺</div>
            )}
            <div className="p-4">
              <h2 className="mb-1 font-bold text-ink">{course.title}</h2>
              <p className="text-xs text-text3">{course.episodes.length} 个分P · 共 {formatDuration(course.totalSeconds)}</p>
            </div>
          </div>
          <div className="rounded-[14px] border border-border bg-surface p-5 shadow-card">
            <p className="mb-2 text-sm text-text2">进度 {done}/{total} 天 · {pct}%</p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-deep" style={{ width: `${pct}%` }} />
            </div>
            <p className="mb-1 text-sm font-semibold text-ink">每日 {dailyMinutes} 分钟 · 共 {total} 天</p>
            {today && (
              <p className="text-sm text-text2">
                当前：第 {today.day} 天 — {today.catalogMain}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={replan} className="rounded-full border border-border px-4 py-2 text-sm text-text2 hover:border-accent">
                重新规划
              </button>
              <CardDownload />
            </div>
          </div>
        </div>
      )}

      {tab === 'today' && today && (
        <div className="rounded-[14px] border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-2 text-lg font-bold">第 {today.day} 天 · {formatDuration(today.totalSec)}</h3>
          <p className="mb-1 font-medium text-accent-text">{today.catalogMain}</p>
          <p className="mb-4 text-sm text-text3">{today.catalogSub}</p>
          <ul className="space-y-2 text-sm text-text2">
            {today.pList.map((p, i) => (
              <li key={i} className="rounded-lg bg-surface2 px-3 py-2">{describePartDetail(p)}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => toggleDayComplete(today.day)}
            className={`mt-4 rounded-full px-5 py-2 text-sm font-semibold ${progress.completedDays?.includes(today.day) ? 'bg-green-100 text-green-700' : 'bg-accent-light text-accent-text'}`}
          >
            {progress.completedDays?.includes(today.day) ? '✓ 已完成' : '标记今日完成'}
          </button>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-3">
          {plan.map((day) => (
            <div key={day.day} className="rounded-[14px] border border-border bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-ink">
                  第 {day.day} 天 · {formatDuration(day.totalSec)}
                </h4>
                <button
                  type="button"
                  onClick={() => toggleDayComplete(day.day)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${progress.completedDays?.includes(day.day) ? 'bg-green-100 text-green-700' : 'bg-surface2 text-text2'}`}
                >
                  {progress.completedDays?.includes(day.day) ? '已完成' : '打勾'}
                </button>
              </div>
              <p className="text-sm font-medium text-accent-text">{day.catalogMain}</p>
              <p className="text-xs text-text3">{day.catalogSub}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
