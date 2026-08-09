'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/hooks/useUiStore';

function formatVipExpiry(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Topbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { openAuth, openVip } = useUiStore();

  const userAreaClass = !auth.session
    ? 'guest'
    : auth.isUnlimited
      ? 'premium'
      : 'free';

  const initial = auth.session?.username.slice(0, 1).toUpperCase() || '👤';
  const userName = auth.session?.username || '访客';
  let userStatus = '免费 3 次/月';
  if (auth.session) {
    if (auth.isUnlimited) userStatus = '⭐ 无限次规划';
    else if (auth.isVip && auth.vip) userStatus = `⭐ VIP 至 ${formatVipExpiry(auth.vip.expireAt)}`;
    else userStatus = auth.freeRemaining > 0 ? `本月剩 ${auth.freeRemaining} 次` : '本月已用完';
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-5 py-3">
        <span className="flex shrink-0 items-center gap-2 text-[0.95rem] font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white shadow">
            📚
          </span>
          B站课表规划器
          <span className="ml-0.5 rounded-full border border-border bg-surface2 px-2 py-0.5 text-[0.68rem] font-medium text-text2">
            智能规划
          </span>
        </span>

        <nav className="flex gap-1">
          <Link
            href="/"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${pathname === '/' ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`}
          >
            功能
          </Link>
          <Link
            href="/mine"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${pathname === '/mine' ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'}`}
          >
            我的
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <div
            className={`user-area flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-1.5 transition ${
              userAreaClass === 'premium'
                ? 'border-premium-border bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] shadow-[0_2px_12px_rgba(245,158,11,0.18)]'
                : userAreaClass === 'free'
                  ? 'border-border bg-gradient-to-br from-white to-surface2'
                  : 'border-border bg-gradient-to-br from-white to-surface2 pr-2'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  userAreaClass === 'premium'
                    ? 'bg-gradient-to-br from-[#FDE68A] to-[#FBBF24] text-[#92400E]'
                    : userAreaClass === 'free'
                      ? 'bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] text-accent-text'
                      : 'bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] text-text3'
                }`}
              >
                {initial}
                {userAreaClass === 'premium' && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#F59E0B] text-[0.5rem] text-white">
                    ★
                  </span>
                )}
              </span>
              <div className="hidden min-w-0 max-w-[108px] flex-col sm:flex">
                <span
                  className={`truncate text-[0.76rem] font-semibold ${userAreaClass === 'premium' ? 'text-premium-name' : userAreaClass === 'guest' ? 'font-medium text-text2' : 'text-ink'}`}
                >
                  {userName}
                </span>
                <span
                  className={`truncate text-[0.65rem] ${userAreaClass === 'premium' ? 'font-semibold text-premium-status' : 'text-text3'}`}
                >
                  {userStatus}
                </span>
              </div>
            </div>
            {!auth.session ? (
              <button type="button" onClick={() => openAuth('login')} className="btn-auth-primary shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep px-3.5 py-1.5 text-[0.76rem] font-semibold text-white shadow">
                登录
              </button>
            ) : (
              <button type="button" onClick={auth.logout} className="shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-medium text-text3 hover:bg-red-50 hover:text-red-600">
                退出
              </button>
            )}
          </div>
          {!(auth.session && auth.isAdmin) && (
            <button
              type="button"
              onClick={openVip}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${auth.session && auth.isVip ? 'bg-gradient-to-br from-accent to-accent-deep text-white shadow' : 'border border-accent/35 bg-surface text-accent-text hover:bg-accent-light'}`}
            >
              {auth.session && auth.isVip ? '续费 VIP' : '⭐ VIP'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
