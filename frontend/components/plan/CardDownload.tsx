'use client';

import { usePlan } from '@/components/plan/PlanPage';
import { formatDuration } from '@/lib/format';
import { displayBvid } from '@/lib/bvid';
import { useToast } from '@/hooks/useToast';

export function CardDownload() {
  const { course, plan, progress } = usePlan();
  const showToast = useToast();

  const generateCard = async () => {
    if (!course || !plan.length) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const done = progress.completedDays?.length || 0;
      const el = document.createElement('div');
      el.style.cssText =
        'width:360px;padding:24px;background:linear-gradient(135deg,#DBEAFE,#fff);font-family:sans-serif;border-radius:16px;';
      el.innerHTML = `
        <div style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:8px">${course.title.slice(0, 40)}</div>
        <div style="font-size:13px;color:#475569;margin-bottom:16px">${displayBvid(course.bvid)} · ${formatDuration(course.totalSeconds)}</div>
        <div style="font-size:14px;color:#1E40AF;font-weight:600">进度 ${done}/${plan.length} 天</div>
        <div style="margin-top:12px;font-size:12px;color:#64748B">生成 by DayPlan</div>
      `;
      document.body.appendChild(el);
      const canvas = await html2canvas(el, { scale: 2 });
      document.body.removeChild(el);
      const link = document.createElement('a');
      link.download = `课表打卡-${displayBvid(course.bvid)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('打卡卡片已下载');
    } catch {
      showToast('生成打卡卡片失败');
    }
  };

  return (
    <button type="button" onClick={generateCard} className="btn-accent">
      生成打卡卡片
    </button>
  );
}
