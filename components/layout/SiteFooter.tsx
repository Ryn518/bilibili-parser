'use client';

import { useUiStore } from '@/hooks/useUiStore';

export function SiteFooter() {
  const { openFeedback } = useUiStore();

  return (
    <footer className="mt-auto border-t border-border/60 bg-white/40 px-4 py-6 backdrop-blur-sm sm:px-5 sm:py-8">
      <div className="mx-auto max-w-[760px] text-center">
        <p className="text-sm font-semibold text-ink">关于本项目</p>
        <p className="mt-2 text-xs leading-relaxed text-text2">
          大学生个人项目，完全免费。粘贴 B 站链接生成学习计划，登录后可保存到「我的课程」。
        </p>
        <p className="mt-2 hidden text-xs leading-relaxed text-text3 sm:block">
          课程与打卡进度主要保存在你的浏览器中；如遇某条链接解析失败、页面异常或功能不好用，欢迎点右下角反馈，我会尽快修复。
          本项目与哔哩哔哩官方无关，视频版权归 UP 主及平台所有。
        </p>
        <button
          type="button"
          onClick={openFeedback}
          className="mt-3 text-xs font-medium text-accent-text underline-offset-2 hover:underline"
        >
          有问题？给我留言
        </button>
        <p className="mt-4 text-[0.68rem] text-text3">B站课表规划器 v2.0 · Made with ☕ for learning</p>
      </div>
    </footer>
  );
}
