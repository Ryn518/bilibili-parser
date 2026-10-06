'use client';

import { useEffect, useState } from 'react';
import { WEEKDAYS, dateKey, parseDateKey } from '@/lib/date-key';

interface Props {
  selected: string | 'all';
  onSelect: (key: string | 'all') => void;
  marked?: Set<string>;
  queryLabel: string;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function mondayIndex(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

export function DayCalendar({ selected, onSelect, marked, queryLabel }: Props) {
  const today = dateKey(new Date());
  const [view, setView] = useState(() => parseDateKey(selected === 'all' ? today : selected));

  useEffect(() => {
    if (selected !== 'all') setView(parseDateKey(selected));
  }, [selected]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i);

  const leading = mondayIndex(year, month);
  const count = daysInMonth(year, month);
  const cells: { key: string; day: number; inMonth: boolean }[] = [];

  for (let i = 0; i < leading; i++) {
    const date = new Date(year, month, 1 - (leading - i));
    cells.push({ key: dateKey(date), day: date.getDate(), inMonth: false });
  }
  for (let d = 1; d <= count; d++) {
    cells.push({ key: dateKey(new Date(year, month, d)), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = parseDateKey(cells[cells.length - 1].key);
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ key: dateKey(next), day: next.getDate(), inMonth: false });
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(30,64,175,0.06)]">
      <p className="text-sm font-semibold text-ink">{queryLabel}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="年份"
          value={year}
          onChange={(e) => setView(new Date(Number(e.target.value), month, 1))}
          className="rounded-lg border border-border bg-surface2 px-2 py-1 text-xs text-ink outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          aria-label="月份"
          value={month}
          onChange={(e) => setView(new Date(year, Number(e.target.value), 1))}
          className="rounded-lg border border-border bg-surface2 px-2 py-1 text-xs text-ink outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}月
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`rounded-lg px-2 py-1 text-xs font-medium ${
            selected === 'all' ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-accent-text'
          }`}
        >
          全部
        </button>
        <button
          type="button"
          onClick={() => onSelect(today)}
          className={`rounded-lg px-2 py-1 text-xs font-medium ${
            selected === today ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-accent-text'
          }`}
        >
          今天
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11px] text-text3">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell) => {
          const active = selected === cell.key;
          const has = marked?.has(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                active
                  ? 'bg-accent font-semibold text-white'
                  : cell.inMonth
                    ? 'text-ink hover:bg-accent-light'
                    : 'text-text3/50 hover:bg-surface2'
              }`}
            >
              {cell.day}
              {has && !active ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
