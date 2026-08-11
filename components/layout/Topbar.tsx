'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';

export function Topbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { openAuth } = useUiStore();

  const initial = auth.session?.username.slice(0, 1).toUpperCase() || '👤';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 text-sm font-bold text-ink sm:text-[0.95rem]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white shadow">
            📚
          </span>
          <span className="truncate sm:hidden">课表规划</span>
          <span className="hidden truncate sm:inline">B站课表规划器</span>
          <span className="ml-0.5 hidden rounded-full border border-border bg-surface2 px-2 py-0.5 text-[0.68rem] font-medium text-text2 lg:inline">
            智能规划
          </span>
        </Link>

        <nav className="hidden gap-1 md:flex">
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {!auth.session ? (
            <>
              <Link
                href="/mine"
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-text2 md:hidden"
              >
                我的
              </Link>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="btn-auth-primary shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-3.5 py-1.5 text-xs font-semibold text-white shadow sm:text-[0.76rem]"
              >
                登录
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface2 py-1 pl-1 pr-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] text-xs font-bold text-accent-text sm:h-8 sm:w-8">
                {initial}
              </span>
              <span className="hidden max-w-[88px] truncate text-xs font-semibold text-ink sm:inline">
                {auth.session.username}
              </span>
              <button
                type="button"
                onClick={auth.logout}
                className="shrink-0 rounded-full px-2 py-1 text-[0.7rem] font-medium text-text3 hover:bg-red-50 hover:text-red-600"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
