'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Course, PlanCache, PlanDay, ProgressRecord } from '@/lib/types';
import { generatePlan } from '@/lib/planner';
import { fetchCourse } from '@/lib/bilibili-client';
import { parsePasteInput } from '@/lib/bvid';
import { normalizeCover } from '@/lib/format';
import {
  dismissContinueBanner,
  isContinueDismissed,
  loadAllProgress,
  loadPlanCache,
  saveAllProgress,
  savePlanCache
} from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';
import { LandingHero } from '@/components/plan/LandingHero';
import { ResultsPanel } from '@/components/plan/ResultsPanel';
import { LoadingOverlay } from '@/components/plan/LoadingOverlay';

interface PlanContextValue {
  course: Course | null;
  plan: PlanDay[];
  progress: ProgressRecord;
  dailyMinutes: number;
  setDailyMinutes: (n: number) => void;
  loading: boolean;
  showResults: boolean;
  startPlanning: (url: string) => Promise<void>;
  restoreFromCache: (cache: PlanCache) => void;
  toggleDayComplete: (day: number) => void;
  replan: () => void;
  backToHome: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}

export function PlanPage() {
  const auth = useAuth();
  const showToast = useToast();
  const { openAuth } = useUiStore();
  const searchParams = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [progress, setProgress] = useState<ProgressRecord>({ completedDays: [] });
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [continueCache, setContinueCache] = useState<PlanCache | null>(null);

  useEffect(() => {
    const cache = loadPlanCache();
    if (cache?.bvid && cache.plan?.length && !isContinueDismissed(cache.bvid)) {
      setContinueCache(cache);
    }
    const bvid = searchParams.get('bvid');
    const daily = searchParams.get('daily');
    if (bvid) {
      setDailyMinutes(Math.max(10, Math.min(480, Number(daily) || 45)));
    }
  }, [searchParams]);

  const persistProgress = useCallback(
    (bvid: string, patch: Partial<ProgressRecord>, snapshot?: PlanCache) => {
      const all = loadAllProgress();
      all[bvid] = {
        completedDays: [],
        ...(all[bvid] || {}),
        ...patch,
        updatedAt: Date.now(),
        ...(snapshot ? { planSnapshot: snapshot } : {})
      };
      saveAllProgress(all);
    },
    []
  );

  const renderPlan = useCallback(
    (courseData: Course, planData: PlanDay[], dailyMin: number) => {
      setCourse(courseData);
      setPlan(planData);
      const prog = loadAllProgress()[courseData.bvid]?.completedDays
        ? loadAllProgress()[courseData.bvid]
        : { completedDays: [] };
      setProgress({ completedDays: prog.completedDays || [] });
      setShowResults(true);

      const cache: PlanCache = {
        bvid: courseData.bvid,
        title: courseData.title,
        totalSeconds: courseData.totalSeconds,
        pList: courseData.episodes,
        plan: planData,
        dailyMinutes: dailyMin,
        generatedAt: new Date().toISOString().slice(0, 10),
        coverUrl: courseData.cover
      };
      savePlanCache(cache);
      persistProgress(courseData.bvid, { dailyMin, title: courseData.title, cover: courseData.cover }, cache);

      const url = new URL(window.location.href);
      url.searchParams.set('bvid', courseData.bvid);
      url.searchParams.set('daily', String(dailyMin));
      window.history.replaceState({}, '', url.pathname + url.search);
    },
    [persistProgress]
  );

  const startPlanning = useCallback(
    async (url: string) => {
      if (!auth.session) {
        showToast('请先登录后再规划课程');
        openAuth('login');
        return;
      }
      if (!auth.canPlan) {
        showToast(`免费版本月规划次数已用完（${3} 次/月），升级 VIP 可无限使用`);
        return;
      }

      const parsed = parsePasteInput(url);
      const videoId = parsed.videoId;
      if (!videoId || typeof videoId !== 'string') {
        showToast('无法识别 BV 号，请粘贴完整 B 站链接');
        return;
      }

      setLoading(true);
      try {
        const courseData = await fetchCourse(videoId);
        const dailyMin = Math.max(10, Math.min(480, dailyMinutes));
        const planData = generatePlan(courseData.episodes, dailyMin);
        if (!auth.consumePlanQuota()) {
          showToast('本月规划次数已用完');
          return;
        }
        renderPlan(courseData, planData, dailyMin);
        showToast('课表规划完成');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '规划失败');
      } finally {
        setLoading(false);
      }
    },
    [auth, showToast, openAuth, dailyMinutes, renderPlan]
  );

  const restoreFromCache = useCallback(
    (cache: PlanCache) => {
      const courseData: Course = {
        bvid: cache.bvid,
        title: cache.title,
        cover: normalizeCover(cache.coverUrl),
        totalSeconds: cache.totalSeconds,
        episodes: cache.pList
      };
      setDailyMinutes(cache.dailyMinutes);
      renderPlan(courseData, cache.plan, cache.dailyMinutes);
      showToast('已恢复上次规划');
    },
    [renderPlan, showToast]
  );

  useEffect(() => {
    const restoreRaw = sessionStorage.getItem('bili-restore-cache');
    if (!restoreRaw) return;
    sessionStorage.removeItem('bili-restore-cache');
    try {
      restoreFromCache(JSON.parse(restoreRaw));
    } catch {
      /* ignore */
    }
  }, [restoreFromCache]);

  const toggleDayComplete = useCallback(
    (day: number) => {
      if (!course) return;
      setProgress((prev) => {
        const set = new Set(prev.completedDays || []);
        if (set.has(day)) set.delete(day);
        else set.add(day);
        const next = { ...prev, completedDays: Array.from(set).sort((a, b) => a - b) };
        persistProgress(course.bvid, next);
        return next;
      });
    },
    [course, persistProgress]
  );

  const replan = useCallback(() => {
    setCourse(null);
    setPlan([]);
    setProgress({ completedDays: [] });
    setShowResults(false);
    setContinueCache(null);
    const url = new URL(window.location.href);
    window.history.replaceState({}, '', url.pathname);
    showToast('已清空，请输入新课程链接');
  }, [showToast]);

  const backToHome = useCallback(() => {
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const value = useMemo(
    () => ({
      course,
      plan,
      progress,
      dailyMinutes,
      setDailyMinutes,
      loading,
      showResults,
      startPlanning,
      restoreFromCache,
      toggleDayComplete,
      replan,
      backToHome
    }),
    [course, plan, progress, dailyMinutes, loading, showResults, startPlanning, restoreFromCache, toggleDayComplete, replan, backToHome]
  );

  return (
    <PlanContext.Provider value={value}>
      <div className="mx-auto max-w-[1080px] px-5 pb-16">
        {!showResults && (
          <LandingHero
            continueCache={continueCache}
            onContinue={() => continueCache && restoreFromCache(continueCache)}
            onDismissContinue={() => {
              if (continueCache) dismissContinueBanner(continueCache.bvid);
              setContinueCache(null);
            }}
            initialUrl={searchParams.get('bvid') ? `https://www.bilibili.com/video/${searchParams.get('bvid')}` : ''}
          />
        )}
        {showResults && course && <ResultsPanel />}
        <LoadingOverlay show={loading} />
      </div>
    </PlanContext.Provider>
  );
}