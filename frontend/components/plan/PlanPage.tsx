'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Course, PlanCache, PlanDay, ProgressRecord } from '@/lib/types';
import { generatePlan, clampDailyMinutes, clampPlaybackSpeed, clampTargetDays, episodesForPlan, studySeconds, videoBudgetMinutes, wallClockMinutesFromTargetDays } from '@/lib/planner';
import { fetchCourse } from '@/lib/bilibili-client';
import { parsePasteInput } from '@/lib/bvid';
import { normalizeCover } from '@/lib/format';
import { CONFIG } from '@/lib/config';
import {
  activePlanSessionKey,
  clearPlanCache,
  clearUserSessionPlanKeys,
  dismissContinueBanner,
  isContinueDismissed,
  isPlanCacheExpired,
  loadAllProgress,
  loadPlanCache,
  saveAllProgress,
  savePlanCache,
  setStorageUser
} from '@/lib/storage';
import { findProgressEntry, resolveCourseCover } from '@/components/plan/plan-utils';
import { restoreCourseForMine } from '@/lib/course-restore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { LandingHero } from '@/components/plan/LandingHero';
import { ResultsPanel } from '@/components/plan/ResultsPanel';
import { LoadingOverlay } from '@/components/plan/LoadingOverlay';
import { SeasonPicker } from '@/components/plan/SeasonPicker';
import { courseFromSections } from '@/lib/season-course';

interface PlanContextValue {
  course: Course | null;
  plan: PlanDay[];
  progress: ProgressRecord;
  dailyMinutes: number;
  setDailyMinutes: (n: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (n: number) => void;
  targetDays: number | null;
  skippedIndexes: number[];
  toggleSkippedEpisode: (index: number) => void;
  clearSkippedEpisodes: () => void;
  loading: boolean;
  showResults: boolean;
  startPlanning: (
    url: string,
    opts?: { dailyMinutes?: number; targetDays?: number | null; playbackSpeed?: number }
  ) => Promise<void>;
  restoreFromCache: (cache: PlanCache) => void;
  toggleDayComplete: (day: number) => void;
  replanDailyMinutes: (minutes: number) => void;
  replanSchedule: (opts: {
    dailyMinutes: number;
    playbackSpeed: number;
    targetDays?: number | null;
  }) => void;
  replan: () => void;
  backToHome: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}

function cacheToCourse(cache: PlanCache, saved?: Pick<ProgressRecord, 'cover'>): Course {
  return {
    bvid: cache.bvid,
    title: cache.title,
    cover: resolveCourseCover(cache, saved),
    totalSeconds: cache.totalSeconds,
    episodes: cache.pList
  };
}

export function PlanPage() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const authRef = useRef(auth);
  authRef.current = auth;

  const [course, setCourse] = useState<Course | null>(null);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [progress, setProgress] = useState<ProgressRecord>({ completedDays: [] });
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [targetDays, setTargetDays] = useState<number | null>(null);
  const [skippedIndexes, setSkippedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [continueCache, setContinueCache] = useState<PlanCache | null>(null);
  const [seasonPick, setSeasonPick] = useState<{
    course: Course;
    opts?: { dailyMinutes?: number; targetDays?: number | null; playbackSpeed?: number };
  } | null>(null);

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
    (
      courseData: Course,
      planData: PlanDay[],
      dailyMin: number,
      completedOverride?: number[],
      extras?: { playbackSpeed?: number; targetDays?: number | null; skippedIndexes?: number[] }
    ) => {
      const normalized: Course = {
        ...courseData,
        cover: normalizeCover(courseData.cover || '')
      };
      setCourse(normalized);
      setPlan(planData);
      const found = findProgressEntry(loadAllProgress(), normalized.bvid);
      const saved = found?.[1];
      const completedDays =
        completedOverride ??
        saved?.completedDays ??
        [];
      setProgress({ completedDays });
      setShowResults(true);

      const speed = extras?.playbackSpeed ?? playbackSpeed;
      const days = extras?.targetDays !== undefined ? extras.targetDays : targetDays;
      if (extras?.playbackSpeed != null) setPlaybackSpeed(clampPlaybackSpeed(extras.playbackSpeed));
      if (extras?.targetDays !== undefined) setTargetDays(extras.targetDays);
      const skipped = extras?.skippedIndexes ?? skippedIndexes;
      if (extras?.skippedIndexes !== undefined) setSkippedIndexes(extras.skippedIndexes);

      const cache: PlanCache = {
        bvid: normalized.bvid,
        title: normalized.title,
        totalSeconds: normalized.totalSeconds,
        pList: normalized.episodes,
        plan: planData,
        dailyMinutes: dailyMin,
        playbackSpeed: speed,
        targetDays: days,
        skippedIndexes: skipped,
        generatedAt: new Date().toISOString().slice(0, 10),
        coverUrl: normalized.cover
      };
      savePlanCache(cache);
      persistProgress(
        found?.[0] || normalized.bvid,
        { dailyMin, title: normalized.title, cover: normalized.cover, completedDays },
        cache
      );
      sessionStorage.setItem(activePlanSessionKey(authRef.current.session?.username), normalized.bvid);

      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    [persistProgress, playbackSpeed, targetDays, skippedIndexes]
  );

  const restoreFromCache = useCallback(
    (cache: PlanCache, opts?: { ignoreExpiry?: boolean }) => {
      if (!cache?.plan?.length) return false;
      if (!opts?.ignoreExpiry && isPlanCacheExpired(cache)) return false;
      const found = findProgressEntry(loadAllProgress(), cache.bvid);
      const saved = found?.[1];
      const coverUrl = resolveCourseCover(cache, saved);
      const enriched: PlanCache = coverUrl && !cache.coverUrl ? { ...cache, coverUrl } : cache;
      setDailyMinutes(enriched.dailyMinutes);
      setPlaybackSpeed(clampPlaybackSpeed(enriched.playbackSpeed ?? 1));
      setTargetDays(enriched.targetDays ?? null);
      renderPlan(cacheToCourse(enriched, saved), enriched.plan, enriched.dailyMinutes, undefined, {
        playbackSpeed: enriched.playbackSpeed ?? 1,
        targetDays: enriched.targetDays ?? null,
        skippedIndexes: enriched.skippedIndexes ?? []
      });
      return true;
    },
    [renderPlan]
  );

  const bootstrappedRef = useRef(false);
  const restoringRef = useRef(false);
  const restoredKeyRef = useRef<string | null>(null);
  const lastAuthUserRef = useRef<string | null>(null);

  const resolveCourseParam = useCallback(() => {
    const fromUrl = searchParams.get('course')?.trim();
    if (fromUrl) return fromUrl;
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem(CONFIG.PENDING_COURSE_KEY)?.trim() || '';
  }, [searchParams]);

  useEffect(() => {
    if (auth.loading || !auth.storageReady) return;

    const courseParam = resolveCourseParam();
    if (!courseParam) return;

    const username = auth.session?.username ?? null;
    if (username) setStorageUser(username);

    const restoreKey = `${courseParam}:${username || 'guest'}:${auth.session?.userId || ''}`;
    if (restoredKeyRef.current === restoreKey || restoringRef.current) return;

    restoringRef.current = true;
    bootstrappedRef.current = true;

    void (async () => {
      setLoading(true);
      try {
        const ok = await restoreCourseForMine({
          bvid: courseParam,
          username,
          token: auth.session?.token,
          userId: auth.session?.userId,
          restoreFromCache: (cache, opts) => restoreFromCache(cache, opts),
          renderFromApi: (courseData, planData, dailyMin, completedDays, extras) => {
            renderPlan(courseData, planData, dailyMin, completedDays, extras);
          }
        });
        if (ok) {
          restoredKeyRef.current = restoreKey;
          sessionStorage.removeItem(CONFIG.PENDING_COURSE_KEY);
          if (typeof window !== 'undefined' && window.location.search.includes('course=')) {
            window.history.replaceState(null, '', '/');
          }
          showToast('已恢复课程');
        } else {
          showToast('无法恢复课程，请重新规划');
          setShowResults(false);
        }
      } finally {
        restoringRef.current = false;
        setLoading(false);
      }
    })();
  }, [
    auth.loading,
    auth.storageReady,
    auth.session?.username,
    auth.session?.token,
    auth.session?.userId,
    resolveCourseParam,
    restoreFromCache,
    renderPlan,
    showToast
  ]);

  useEffect(() => {
    if (auth.loading || !auth.storageReady) return;
    if (restoringRef.current || restoredKeyRef.current) return;
    if (resolveCourseParam()) return;

    const username = auth.session?.username ?? null;
    if (username !== lastAuthUserRef.current) {
      bootstrappedRef.current = false;
      lastAuthUserRef.current = username;
    }

    const resetToHome = () => {
      setCourse(null);
      setPlan([]);
      setProgress({ completedDays: [] });
      setShowResults(false);
      setContinueCache(null);
    };

    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    resetToHome();

    const cache = loadPlanCache();
    if (cache && isPlanCacheExpired(cache)) {
      clearPlanCache();
      return;
    }

    const planKey = activePlanSessionKey(username);
    const activeBvid = sessionStorage.getItem(planKey) || sessionStorage.getItem('bili-active-plan');
    if (activeBvid && cache?.bvid === activeBvid && cache.plan?.length) {
      restoreFromCache(cache);
      return;
    }

    if (cache?.bvid && cache.plan?.length && !isContinueDismissed(cache.bvid)) {
      setContinueCache(cache);
    }
  }, [auth.loading, auth.storageReady, auth.session?.username, resolveCourseParam, restoreFromCache, showToast]);

  const commitPlan = useCallback(
    (courseData: Course, opts?: { dailyMinutes?: number; targetDays?: number | null; playbackSpeed?: number }) => {
      const speed = clampPlaybackSpeed(opts?.playbackSpeed ?? playbackSpeed);
      const days = opts?.targetDays != null && opts.targetDays > 0 ? clampTargetDays(opts.targetDays) : null;
      const wall = days
        ? wallClockMinutesFromTargetDays(courseData.totalSeconds, days, speed)
        : clampDailyMinutes(opts?.dailyMinutes ?? dailyMinutes);
      const planData = generatePlan(courseData.episodes, videoBudgetMinutes(wall, speed));
      if (!planData.length) {
        showToast('未能生成课表，请检查课程分P数据');
        return;
      }
      setDailyMinutes(wall);
      setPlaybackSpeed(speed);
      setTargetDays(days);
      setSkippedIndexes([]);
      renderPlan(courseData, planData, wall, undefined, {
        playbackSpeed: speed,
        targetDays: days,
        skippedIndexes: []
      });
      if (!authRef.current.session) {
        showToast('课表已生成 · 登录后可保存到「我的课程」');
      } else if (days) {
        showToast(`已按 ${days} 天倒推：每天约 ${wall} 分钟 · ${speed}x，共 ${planData.length} 天`);
      } else if (speed !== 1) {
        showToast(`课表规划完成 · ${speed}x 每天 ${wall} 分钟约看 ${Math.round(wall * speed)} 分钟视频`);
      } else {
        showToast('课表规划完成');
      }
    },
    [showToast, dailyMinutes, playbackSpeed, renderPlan]
  );

  const startPlanning = useCallback(
    async (
      url: string,
      opts?: { dailyMinutes?: number; targetDays?: number | null; playbackSpeed?: number }
    ) => {
      const trimmed = url.trim();
      if (!trimmed) {
        showToast('请输入课程链接');
        return;
      }

      if (authRef.current.loading) {
        showToast('正在加载，请稍候…');
        return;
      }

      const parsed = parsePasteInput(trimmed);
      if (!parsed.videoId) {
        showToast('无法识别 BV 号，请粘贴完整 B 站分享内容');
        return;
      }

      setLoading(true);
      try {
        const courseData = await fetchCourse(trimmed);
        if (courseData.sections && courseData.sections.length > 1) {
          setSeasonPick({ course: courseData, opts });
          return;
        }
        commitPlan(courseData, opts);
      } catch (err) {
        showToast(err instanceof Error ? err.message : '规划失败');
      } finally {
        setLoading(false);
      }
    },
    [showToast, commitPlan]
  );

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

  const applyReplan = useCallback(
    (wall: number, speed: number, days: number | null, skipped: number[] = skippedIndexes, notice?: string) => {
      if (!course) return;
      const included = episodesForPlan(course.episodes, skipped);
      if (!included.length) {
        showToast('至少留一个要学的视频');
        return;
      }
      const s = clampPlaybackSpeed(speed);
      const seconds = studySeconds(course.episodes, skipped);
      const m = days ? wallClockMinutesFromTargetDays(seconds, days, s) : clampDailyMinutes(wall);
      const planData = generatePlan(included, videoBudgetMinutes(m, s));
      if (!planData.length) {
        showToast('未能生成课表，请检查课程分P数据');
        return;
      }

      const validDays = new Set(planData.map((d) => d.day));
      const completedDays = (progress.completedDays || []).filter((d) => validDays.has(d));

      setDailyMinutes(m);
      setPlaybackSpeed(s);
      setTargetDays(days);
      setSkippedIndexes(skipped);
      setPlan(planData);
      setProgress((prev) => ({ ...prev, completedDays }));

      const cache: PlanCache = {
        bvid: course.bvid,
        title: course.title,
        totalSeconds: course.totalSeconds,
        pList: course.episodes,
        plan: planData,
        dailyMinutes: m,
        playbackSpeed: s,
        targetDays: days,
        skippedIndexes: skipped,
        generatedAt: new Date().toISOString().slice(0, 10),
        coverUrl: course.cover
      };
      savePlanCache(cache);
      persistProgress(course.bvid, { dailyMin: m, completedDays }, cache);
      if (notice) {
        showToast(`${notice}，共 ${planData.length} 天`);
      } else if (days) {
        showToast(`已按 ${days} 天倒推：每天约 ${m} 分钟 · ${s}x，共 ${planData.length} 天`);
      } else if (s !== 1) {
        showToast(`已按每天 ${m} 分钟 · ${s}x 重新规划，共 ${planData.length} 天`);
      } else {
        showToast(`已按每天 ${m} 分钟重新规划，共 ${planData.length} 天`);
      }
    },
    [course, progress.completedDays, showToast, persistProgress, skippedIndexes]
  );

  const replanDailyMinutes = useCallback(
    (minutes: number) => {
      applyReplan(minutes, playbackSpeed, null, skippedIndexes);
    },
    [applyReplan, playbackSpeed, skippedIndexes]
  );

  const replanSchedule = useCallback(
    (opts: { dailyMinutes: number; playbackSpeed: number; targetDays?: number | null }) => {
      if (!course) return;
      const s = clampPlaybackSpeed(opts.playbackSpeed);
      const days = opts.targetDays != null && opts.targetDays > 0 ? clampTargetDays(opts.targetDays) : null;
      const seconds = studySeconds(course.episodes, skippedIndexes);
      const wall = days
        ? wallClockMinutesFromTargetDays(seconds, days, s)
        : clampDailyMinutes(opts.dailyMinutes);
      applyReplan(wall, s, days, skippedIndexes);
    },
    [course, applyReplan, skippedIndexes]
  );

  const toggleSkippedEpisode = useCallback(
    (index: number) => {
      if (!course) return;
      const next = skippedIndexes.includes(index)
        ? skippedIndexes.filter((n) => n !== index)
        : [...skippedIndexes, index];
      if (!episodesForPlan(course.episodes, next).length) {
        showToast('至少留一个要学的视频');
        return;
      }
      const removed = next.length > skippedIndexes.length;
      applyReplan(
        dailyMinutes,
        playbackSpeed,
        targetDays,
        next,
        removed ? `已排除 ${next.length} 个视频，按剩下的内容重排` : '已加回这个视频，课表已重排'
      );
    },
    [course, skippedIndexes, showToast, applyReplan, dailyMinutes, playbackSpeed, targetDays]
  );

  const clearSkippedEpisodes = useCallback(() => {
    if (!skippedIndexes.length) return;
    applyReplan(dailyMinutes, playbackSpeed, targetDays, [], '已加回全部视频，课表已重排');
  }, [skippedIndexes.length, applyReplan, dailyMinutes, playbackSpeed, targetDays]);

  const replan = useCallback(() => {
    setCourse(null);
    setPlan([]);
    setProgress({ completedDays: [] });
    setSkippedIndexes([]);
    setShowResults(false);
    setContinueCache(null);
    clearPlanCache();
    clearUserSessionPlanKeys(authRef.current.session?.username);
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
      playbackSpeed,
      setPlaybackSpeed,
      targetDays,
      skippedIndexes,
      toggleSkippedEpisode,
      clearSkippedEpisodes,
      loading,
      showResults,
      startPlanning,
      restoreFromCache,
      toggleDayComplete,
      replanDailyMinutes,
      replanSchedule,
      replan,
      backToHome
    }),
    [course, plan, progress, dailyMinutes, playbackSpeed, targetDays, skippedIndexes, loading, showResults, startPlanning, restoreFromCache, toggleDayComplete, toggleSkippedEpisode, clearSkippedEpisodes, replanDailyMinutes, replanSchedule, replan, backToHome]
  );

  return (
    <PlanContext.Provider value={value}>
      <div className="mx-auto max-w-[1180px] px-5 pb-16 max-md:px-4 max-md:pb-28">
        {!showResults && (
          <LandingHero
            continueCache={continueCache}
            onContinue={() => {
              if (continueCache) {
                restoreFromCache(continueCache);
                showToast('已恢复上次规划');
              }
            }}
            onDismissContinue={() => {
              if (continueCache) dismissContinueBanner(continueCache.bvid);
              setContinueCache(null);
            }}
          />
        )}
        {showResults && course && plan.length > 0 && <ResultsPanel />}
        {showResults && course && plan.length === 0 && (
          <div className="py-16 text-center text-text2">课表为空，请重新规划。</div>
        )}
        <LoadingOverlay show={loading} />
        {seasonPick ? (
          <SeasonPicker
            course={seasonPick.course}
            onCancel={() => setSeasonPick(null)}
            onConfirm={(sectionIds) => {
              const next = courseFromSections(seasonPick.course, sectionIds);
              const opts = seasonPick.opts;
              setSeasonPick(null);
              if (!next.episodes.length) {
                showToast('这一门里没有可排的视频');
                return;
              }
              commitPlan(next, opts);
            }}
          />
        ) : null}
      </div>
    </PlanContext.Provider>
  );
}
