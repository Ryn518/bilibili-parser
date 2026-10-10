'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';

const NAV = [
  { href: '/', label: '功能' },
  { href: '/plaza', label: '广场' },
  { href: '/updates', label: '更新' },
  { href: '/mine', label: '我的' }
] as const;

function navClass(active: boolean, compact?: boolean) {
  return `rounded-full font-medium transition ${
    compact ? 'px-2 py-2 text-center text-xs' : 'px-4 py-1.5 text-sm'
  } ${active ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`;
}

export function Topbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { openAuth } = useUiStore();

  const userAreaClass = auth.session ? 'free' : 'guest';
  const initial = auth.session?.username.slice(0, 1).toUpperCase() || '👤';
  const userName = auth.session?.username || '访客';
  const userStatus = auth.session ? '免费无限使用' : '登录后保存课程';

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1080px] px-5 py-3 max-md:px-3 max-md:py-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 text-[0.95rem] font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white shadow">
              📚
            </span>
            <span>DayPlan</span>
            <span className="ml-0.5 hidden rounded-full border border-border bg-surface2 px-2 py-0.5 text-[0.68rem] font-medium text-text2 md:inline">
              视频课表
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={navClass(isActive(item.href))}>
                {item.label}
              </Link>
            ))}
            {auth.isAdmin && (
              <Link
                href="/admin/feedback"
                className={navClass(pathname === '/admin/feedback')}
              >
                反馈
              </Link>
            )}
          </nav>

          <div className="flex shrink-0 items-center">
            <div
              className={`user-area flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-1 transition ${
                userAreaClass === 'free'
                  ? 'border-border bg-gradient-to-br from-white to-surface2'
                  : 'border-border bg-gradient-to-br from-white to-surface2 pr-1.5'
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
                <div className="hidden min-w-0 max-w-[108px] flex-col md:flex">
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
                  className="btn-auth-primary shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-3 py-1.5 text-[0.76rem] font-semibold text-white shadow"
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

        <nav className="mt-2 grid grid-cols-4 gap-1 md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navClass(isActive(item.href), true)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
