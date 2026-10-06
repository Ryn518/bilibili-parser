'use client';

import type { ReactNode } from 'react';
import { DayCalendar } from '@/components/feed/DayCalendar';
import { formatDayHeading } from '@/lib/date-key';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  queryLabel: string;
  selected: string | 'all';
  onSelect: (key: string | 'all') => void;
  marked: Set<string>;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function FeedBoard({
  eyebrow,
  title,
  subtitle,
  queryLabel,
  selected,
  onSelect,
  marked,
  toolbar,
  children
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-4 md:px-5 md:pb-8 md:pt-6">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 order-2 lg:order-1">
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-r from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] px-5 py-7 text-white shadow-[0_12px_32px_rgba(37,99,235,0.28)] sm:px-8 sm:py-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-white/80">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-white/85">{subtitle}</p>
          </section>

          {toolbar ? <div className="mt-4">{toolbar}</div> : null}

          <p className="mt-5 text-sm font-semibold text-accent-text">
            {selected === 'all' ? '全部日期' : formatDayHeading(selected)}
          </p>

          <div className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-[0_10px_32px_rgba(30,64,175,0.06)]">
            {children}
          </div>
        </div>

        <aside className="order-1 lg:sticky lg:top-24 lg:order-2">
          <DayCalendar selected={selected} onSelect={onSelect} marked={marked} queryLabel={queryLabel} />
        </aside>
      </div>
    </div>
  );
}
