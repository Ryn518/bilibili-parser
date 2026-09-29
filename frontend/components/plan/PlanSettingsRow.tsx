'use client';

import { PLAYBACK_SPEEDS, clampDailyMinutes } from '@/lib/planner';

export type PlanInputMode = 'daily' | 'days';

interface Props {
  mode: PlanInputMode;
  onModeChange: (mode: PlanInputMode) => void;
  dailyDraft: string;
  onDailyDraftChange: (v: string) => void;
  onDailyCommit: () => void;
  daysDraft: string;
  onDaysDraftChange: (v: string) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (n: number) => void;
  className?: string;
  radioName?: string;
}

const fieldClass =
  'daily-min-input w-[88px] rounded-xl border border-border bg-surface px-3 py-2 text-center text-base font-semibold text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

export function PlanSettingsRow({
  mode,
  onModeChange,
  dailyDraft,
  onDailyDraftChange,
  onDailyCommit,
  daysDraft,
  onDaysDraftChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  className,
  radioName = 'plan-input-mode'
}: Props) {
  const dailyActive = mode === 'daily';
  const wall = clampDailyMinutes(Number(dailyDraft)) || 45;

  return (
    <div className={`mx-auto w-full max-w-[520px] ${className || 'mt-4'}`}>
      <div className="rounded-2xl border border-border bg-surface px-3 py-3 shadow-sm sm:px-4">
        <div
          id={radioName}
          className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1"
          role="radiogroup"
          aria-label="规划方式"
        >
          <button
            type="button"
            role="radio"
            aria-checked={dailyActive}
            onClick={() => onModeChange('daily')}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
              dailyActive ? 'bg-surface text-accent-text shadow-sm' : 'text-text3 hover:text-text2'
            }`}
          >
            按每天时长
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!dailyActive}
            onClick={() => onModeChange('days')}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
              !dailyActive ? 'bg-surface text-accent-text shadow-sm' : 'text-text3 hover:text-text2'
            }`}
          >
            按几天学完
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {dailyActive ? (
            <label className="flex items-center justify-center gap-2 text-sm text-text2 sm:justify-start">
              <span>每天学习</span>
              <input
                id="dailyMinInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={dailyDraft}
                onChange={(e) => onDailyDraftChange(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={onDailyCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onDailyCommit();
                  }
                }}
                className={fieldClass}
                aria-label="每天学习分钟数"
              />
              <span>分钟</span>
            </label>
          ) : (
            <label className="flex items-center justify-center gap-2 text-sm text-text2 sm:justify-start">
              <span>想</span>
              <input
                id="targetDaysInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="几天"
                value={daysDraft}
                onChange={(e) => onDaysDraftChange(e.target.value.replace(/[^\d]/g, ''))}
                className={fieldClass}
                aria-label="想几天学完"
              />
              <span>天学完</span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
            <span className="mr-0.5 text-xs font-medium text-text3">倍速</span>
            {PLAYBACK_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPlaybackSpeedChange(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  playbackSpeed === s
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface2 text-text2 hover:bg-accent-light hover:text-accent-text'
                }`}
                aria-pressed={playbackSpeed === s}
                aria-label={`${s}倍速`}
              >
                {s === 1 ? '原速' : `${s}x`}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-text3 sm:text-left">
          {dailyActive
            ? `10–480 分钟${
                playbackSpeed !== 1
                  ? ` · ${playbackSpeed}x 约等于每天看 ${Math.round(wall * playbackSpeed)} 分钟视频`
                  : ''
              }`
            : `按课程总时长倒推每天要看多久（10–480 分钟）${
                playbackSpeed !== 1 ? ` · 已计入 ${playbackSpeed}x` : ''
              }`}
        </p>
      </div>
    </div>
  );
}
