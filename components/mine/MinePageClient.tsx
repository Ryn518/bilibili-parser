'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadAllProgress, saveAllProgress } from '@/lib/storage';
import { formatDuration } from '@/lib/format';
import { openCourseFromHistory } from '@/components/plan/plan-utils';

export function MinePageClient() {
  const router = useRouter();
  const [records, setRecords] = useState<Record<string, import('@/lib/types').ProgressRecord>>({});

  useEffect(() => {
    setRecords(loadAllProgress());
  }, []);

  const entries = Object.entries(records);

  const openCourse = (bvid: string, dailyMin: number) => {
    const cache = openCourseFromHistory(bvid, dailyMin);
    if (cache) {
      sessionStorage.setItem('bili-restore-cache', JSON.stringify(cache));
      router.push('/');
    }
  };

  const removeCourse = (bvid: string) => {
    const all = loadAllProgress();
    delete all[bvid];
    saveAllProgress(all);
    setRecords({ ...all });
  };

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">我的课程</h1>
      {entries.length === 0 ? (
        <p className="text-text2">还没有学习记录，去首页规划一门课程吧。</p>
      ) : (
        <div className="grid gap-3">
          {entries.map(([bvid, rec]) => {
            const done = rec.completedDays?.length || 0;
            const total = rec.planSnapshot?.plan?.length || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div
                key={bvid}
                className="flex cursor-pointer items-center gap-4 rounded-[14px] border border-border bg-surface p-4 shadow-card hover:border-accent/40"
                onClick={() => openCourse(bvid, rec.dailyMin || rec.planSnapshot?.dailyMinutes || 45)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{rec.title || rec.planSnapshot?.title || bvid}</p>
                  <p className="text-xs text-text3">
                    {bvid} · {rec.planSnapshot ? formatDuration(rec.planSnapshot.totalSeconds) : ''}
                  </p>
                </div>
                <div className="text-sm font-semibold text-accent-text">{pct}%</div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-lg hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这条学习记录吗？')) removeCourse(bvid);
                  }}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
