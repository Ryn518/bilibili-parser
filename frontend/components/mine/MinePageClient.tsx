'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CONFIG } from '@/lib/config';
import { loadAllProgress, saveAllProgress } from '@/lib/storage';
import { formatDuration } from '@/lib/format';
import { normalizePlanDays } from '@/lib/plan-normalize';
import { resolveCourseCover } from '@/components/plan/plan-utils';
import { useAuth } from '@/hooks/useAuth';
import { CoverImage } from '@/components/ui/CoverImage';

export function MinePageClient() {
  const router = useRouter();
  const auth = useAuth();
  const [records, setRecords] = useState<Record<string, import('@/lib/types').ProgressRecord>>({});

  useEffect(() => {
    if (auth.loading || !auth.storageReady) return;
    if (!auth.session?.username) {
      setRecords({});
      return;
    }
    setRecords(loadAllProgress());
  }, [auth.loading, auth.storageReady, auth.session?.username, auth.session?.userId]);

  const entries = Object.entries(records);

  const openCourse = (bvid: string) => {
    sessionStorage.setItem(CONFIG.PENDING_COURSE_KEY, bvid);
    router.push(`/?course=${encodeURIComponent(bvid)}`);
  };

  const removeCourse = async (bvid: string) => {
    try {
      if (auth.session?.userId) {
        const { deleteCloudCourse } = await import('@/lib/cloud-sync');
        await deleteCloudCourse(bvid);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
      return;
    }
    const all = loadAllProgress();
    delete all[bvid];
    saveAllProgress(all);
    setRecords({ ...all });
  };

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">我的课程</h1>
      {!auth.session ? (
        <p className="text-text2">请先登录后查看你的课程记录。</p>
      ) : entries.length === 0 ? (
        <p className="text-text2">还没有学习记录，去首页规划一门课程吧。</p>
      ) : (
        <div className="grid gap-3">
          {entries.map(([bvid, rec]) => {
            const done = rec.completedDays?.length || 0;
            const total = rec.planSnapshot ? normalizePlanDays(rec.planSnapshot.plan).length : 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const cover = resolveCourseCover(rec.planSnapshot, rec);
            return (
              <div
                key={bvid}
                className="flex cursor-pointer items-center gap-4 rounded-[14px] border border-border bg-surface p-4 shadow-card transition hover:border-accent/40 hover:shadow-lg"
                onClick={() => openCourse(bvid)}
              >
                <CoverImage
                  src={cover}
                  wrapperClassName="h-[52px] w-[84px] shrink-0 rounded-lg border border-border"
                  className="h-full w-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{rec.title || rec.planSnapshot?.title || bvid}</p>
                  <p className="text-xs text-text3">
                    {bvid} · {rec.planSnapshot ? formatDuration(rec.planSnapshot.totalSeconds) : ''}
                    {total > 0 ? ` · 已完成 ${done}/${total} 天` : ''}
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
