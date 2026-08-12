'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';

export function Topbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { openAuth } = useUiStore();

  const userAreaClass = auth.session ? 'free' : 'guest';

  const initial = auth.session?.username.slice(0, 1).toUpperCase() || '👤';
  const userName = auth.session?.username || '访客';
  const userStatus = auth.session ? '免费无限使用' : '登录后保存课程';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-5 py-3 max-md:gap-2 max-md:px-3 max-md:py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[0.95rem] font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white shadow">
            📚
          </span>
          <span className="max-md:hidden">视频课表规划器</span>
          <span className="hidden max-md:inline">课表规划</span>
          <span className="ml-0.5 rounded-full border border-border bg-surface2 px-2 py-0.5 text-[0.68rem] font-medium text-text2 max-md:hidden">
            智能规划
          </span>
        </Link>

        <nav className="flex gap-1 max-md:hidden">
          <Link
            href="/"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${pathname === '/' ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`}
          >
            功能
          </Link>
          {auth.isAdmin && (
            <Link
              href="/admin/feedback"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${pathname === '/admin/feedback' ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`}
            >
              反馈
            </Link>
          )}
          <Link
            href="/mine"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${pathname === '/mine' ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`}
          >
            我的
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/mine"
            className={`hidden rounded-full px-3 py-1.5 text-xs font-medium max-md:inline-flex ${
              pathname === '/mine' ? 'bg-accent-light text-accent-text' : 'text-text2'
            }`}
          >
            我的
          </Link>
          <div
            className={`user-area flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-1.5 transition ${
              userAreaClass === 'free'
                ? 'border-border bg-gradient-to-br from-white to-surface2'
                : 'border-border bg-gradient-to-br from-white to-surface2 pr-2'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  userAreaClass === 'free'
                    ? 'bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] text-accent-text'
                    : 'bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] text-text3'
                }`}
              >
                {initial}
              </span>
              <div className="hidden min-w-0 max-w-[108px] flex-col sm:flex">
                <span
                  className={`truncate text-[0.76rem] font-semibold ${userAreaClass === 'guest' ? 'font-medium text-text2' : 'text-ink'}`}
                >
                  {userName}
                </span>
                <span className="truncate text-[0.65rem] text-text3">{userStatus}</span>
              </div>
            </div>
            {!auth.session ? (
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="btn-auth-primary shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-3.5 py-1.5 text-[0.76rem] font-semibold text-white shadow"
              >
                登录
              </button>
            ) : (
              <button
                type="button"
                onClick={auth.logout}
                className="shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-medium text-text3 hover:bg-red-50 hover:text-red-600"
              >
                退出
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
