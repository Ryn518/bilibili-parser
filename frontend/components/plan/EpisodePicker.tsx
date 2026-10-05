'use client';

import { useMemo, useState } from 'react';
import type { Episode } from '@/lib/types';
import { formatDuration } from '@/lib/format';
import { studySeconds } from '@/lib/planner';

interface Props {
  episodes: Episode[];
  skippedIndexes: number[];
  onToggle: (index: number) => void;
  onClear: () => void;
}

export function EpisodePicker({ episodes, skippedIndexes, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const skipped = useMemo(() => new Set(skippedIndexes), [skippedIndexes]);
  const kept = episodes.length - skipped.size;
  const keptSeconds = studySeconds(episodes, skippedIndexes);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter((ep) => {
      const label = `p${ep.index + 1}`;
      return label.includes(q) || ep.title.toLowerCase().includes(q);
    });
  }, [episodes, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-border2 bg-surface2/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">排除不想学的视频</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-text3">
            {skipped.size
              ? `已排除 ${skipped.size} 个，还学 ${kept} 个 · 约 ${formatDuration(keptSeconds)}`
              : `共 ${episodes.length} 个，点一下就排除，课表会按剩下的自动重排`}
          </span>
        </span>
        <span className={`shrink-0 text-xs text-text3 transition ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-border2 px-3 pb-3 pt-2">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜 P 号或标题"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
            {skipped.size > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-light"
              >
                全部加回
              </button>
            )}
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-0.5">
            {visible.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-text3">没有匹配的视频</p>
            )}
            {visible.map((ep) => {
              const off = skipped.has(ep.index);
              return (
                <div
                  key={ep.index}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    off ? 'bg-surface/80' : 'bg-surface'
                  }`}
                >
                  <span
                    className={`w-9 shrink-0 text-[0.68rem] font-semibold ${off ? 'text-text3' : 'text-accent-text'}`}
                  >
                    P{ep.index + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-xs ${off ? 'text-text3 line-through' : 'text-ink'}`}>
                    {ep.title}
                  </span>
                  <span className="shrink-0 text-[0.68rem] text-text3">{formatDuration(ep.duration)}</span>
                  <button
                    type="button"
                    onClick={() => onToggle(ep.index)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold transition ${
                      off
                        ? 'bg-accent-light text-accent-text hover:bg-accent/15'
                        : 'bg-surface2 text-text2 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                  >
                    {off ? '加回' : '排除'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
