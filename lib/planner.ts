import type { CatalogRange, Episode, PlanDay, PlanPart } from './types';
import { formatDuration, formatShort } from './format';

export function getCatalogRange(
  day: { pList: PlanPart[] },
  episodes?: Episode[]
): CatalogRange {
  const parts = day.pList;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const studyLabel = formatDuration(parts.reduce((s, p) => s + p.duration, 0));
  const continues = first.partial && first.startAt > 0;

  if (parts.length === 1) {
    if (continues) {
      const fullDur = episodes?.[first.index]?.duration || last.endAt;
      return {
        main: `继续「${first.title}」从 ${formatShort(first.startAt)} 看到 ${formatShort(first.endAt)}`,
        sub: `本日学习约 ${studyLabel}${last.endAt < fullDur ? ' · 本集仍未看完' : ''}`
      };
    }
    if (last.partial) {
      return {
        main: `「${last.title}」从头看到 ${formatShort(last.endAt)}（本集未看完，明天继续）`,
        sub: `本日学习约 ${studyLabel}`
      };
    }
    return {
      main: `学完「${first.title}」`,
      sub: `本日学习约 ${studyLabel} · 目录第 ${first.index + 1} 条`
    };
  }

  if (last.partial) {
    const fullEnd = parts.length > 1 ? parts[parts.length - 2].title : null;
    let main: string;
    if (continues && fullEnd) {
      main = `继续「${first.title}」${formatShort(first.startAt)}→${formatShort(first.endAt)}，再看到「${fullEnd}」整集，「${last.title}」看到 ${formatShort(last.endAt)}（明日继续）`;
    } else if (continues) {
      main = `继续「${first.title}」${formatShort(first.startAt)}→${formatShort(first.endAt)}，「${last.title}」看到 ${formatShort(last.endAt)}（明日继续）`;
    } else if (fullEnd) {
      main = `从「${first.title}」到「${fullEnd}」整集，「${last.title}」看到 ${formatShort(last.endAt)}（本集未看完，明天继续）`;
    } else {
      main = `「${first.title}」看到 ${formatShort(last.endAt)}（本集未看完，明天继续）`;
    }
    return {
      main,
      sub: `本日学习约 ${studyLabel} · 目录第 ${first.index + 1}–${last.index + 1} 条 · ${parts.length} 个视频`
    };
  }

  if (continues) {
    const fullEnd = parts.length > 1 ? parts[parts.length - 1].title : first.title;
    const main =
      parts.length > 1
        ? `继续「${first.title}」${formatShort(first.startAt)}→${formatShort(first.endAt)}，再学到「${fullEnd}」`
        : `继续「${first.title}」从 ${formatShort(first.startAt)} 看到 ${formatShort(first.endAt)}`;
    return {
      main,
      sub: `本日学习约 ${studyLabel} · 目录第 ${first.index + 1}–${last.index + 1} 条`
    };
  }

  return {
    main: `从「${first.title}」到「${last.title}」`,
    sub: `本日学习约 ${studyLabel} · 目录第 ${first.index + 1}–${last.index + 1} 条 · ${parts.length} 个视频`
  };
}

export function describePartDetail(p: PlanPart): string {
  if (p.partial && p.startAt > 0) {
    return `继续「${p.title}」${formatShort(p.startAt)} → ${formatShort(p.endAt)}（本段 ${formatDuration(p.duration)}）`;
  }
  if (p.partial) {
    return `「${p.title}」0:00 → ${formatShort(p.endAt)}（本段 ${formatDuration(p.duration)}，本集未看完）`;
  }
  return `「${p.title}」整集（${formatDuration(p.duration)}）`;
}

export function generatePlan(episodes: Episode[], dailyMin: number): PlanDay[] {
  const dailySec = dailyMin * 60;
  const flexSec = Math.floor(dailySec * 0.15);
  const plan: PlanDay[] = [];
  let dayNum = 1;
  let i = 0;
  let offset = 0;

  while (i < episodes.length) {
    const parts: PlanPart[] = [];
    let used = 0;

    while (i < episodes.length) {
      const ep = episodes[i];
      const remain = ep.duration - offset;
      const left = dailySec - used;

      if (remain <= left) {
        parts.push({
          index: i,
          title: ep.title,
          duration: remain,
          partial: offset > 0,
          fullEpisode: true,
          startAt: offset,
          endAt: ep.duration
        });
        used += remain;
        i++;
        offset = 0;
        continue;
      }

      if (offset === 0 && remain <= left + flexSec) {
        parts.push({
          index: i,
          title: ep.title,
          duration: remain,
          partial: false,
          fullEpisode: true,
          flexFinish: true,
          startAt: 0,
          endAt: ep.duration
        });
        used += remain;
        i++;
        break;
      }

      if (left <= 0) break;

      parts.push({
        index: i,
        title: ep.title,
        duration: left,
        partial: true,
        fullEpisode: false,
        startAt: offset,
        endAt: offset + left
      });
      used += left;
      offset += left;
      break;
    }

    if (!parts.length) break;

    const catalog = getCatalogRange({ pList: parts }, episodes);
    plan.push({
      day: dayNum,
      pList: parts,
      catalogMain: catalog.main,
      catalogSub: catalog.sub,
      totalSec: parts.reduce((s, p) => s + p.duration, 0)
    });
    dayNum++;
  }

  return plan;
}
