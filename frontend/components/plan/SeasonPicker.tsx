'use client';

import { useState } from 'react';
import type { Course } from '@/lib/types';
import { formatDuration } from '@/lib/format';

interface Props {
  course: Course;
  onCancel: () => void;
  onConfirm: (sectionIds: string[]) => void;
}

export function SeasonPicker({ course, onCancel, onConfirm }: Props) {
  const sections = course.sections ?? [];
  const [selected, setSelected] = useState<string[]>(() => {
    if (course.currentSectionId && sections.some((section) => section.id === course.currentSectionId)) {
      return [course.currentSectionId];
    }
    return sections[0] ? [sections[0].id] : [];
  });

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const allOn = sections.length > 0 && selected.length === sections.length;

  return (
    <div className="modal-overlay" style={{ zIndex: 140 }} onClick={onCancel}>
      <div
        className="flex h-[min(760px,calc(100vh-5.5rem))] w-[min(980px,calc(100vw-3rem))] flex-col rounded-[28px] bg-white p-7 shadow-lg max-md:h-[min(680px,calc(100vh-2rem))] max-md:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="season-picker-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-accent-text">这个链接里有多门课</p>
            <h3 id="season-picker-title" className="mt-1.5 text-[1.65rem] font-bold tracking-tight text-ink">
              先选要排的课
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text2">
              {course.title ? `「${course.title}」里有 ${sections.length} 门。` : ''}
              点一门就只排它，多选则按顺序排进同一张课表。
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-border bg-surface2 px-3.5 py-1.5 text-xs font-semibold text-accent-text transition hover:border-accent"
            onClick={() => setSelected(allOn ? [] : sections.map((section) => section.id))}
          >
            {allOn ? '取消全选' : '全选'}
          </button>
        </div>

        <ul className="mt-5 grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {sections.map((section, index) => {
            const on = selected.includes(section.id);
            const current = section.id === course.currentSectionId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className={`flex h-full w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                    on
                      ? 'border-accent bg-accent-light shadow-[0_8px_20px_rgba(59,130,246,0.12)]'
                      : 'border-border bg-[#F7FAFE] hover:border-accent/50 hover:bg-white'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border text-[11px] font-bold ${
                      on ? 'border-accent bg-accent text-white' : 'border-border2 bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug text-ink">{section.title}</span>
                      <span className="shrink-0 text-[11px] font-medium text-text3">{String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text3">
                      <span>
                        {section.episodeCount} 集 · {formatDuration(section.totalSeconds)}
                      </span>
                      {current ? (
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-accent-text">当前视频</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border/80 pt-5">
          <p className="text-sm text-text2">{selected.length ? `已选 ${selected.length} 门` : '先选一门课'}</p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-text2 transition hover:bg-surface2"
            >
              取消
            </button>
            <button
              type="button"
              className="btn-primary px-7"
              disabled={!selected.length}
              onClick={() =>
                onConfirm(sections.filter((section) => selected.includes(section.id)).map((section) => section.id))
              }
            >
              {selected.length > 1 ? `排选中的 ${selected.length} 门` : '开始规划'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
