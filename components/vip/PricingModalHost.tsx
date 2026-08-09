'use client';

import { CONFIG } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';

export function PricingModalHost() {
  const { vipOpen, closeVip } = useUiStore();
  const auth = useAuth();
  const showToast = useToast();

  if (!vipOpen) return null;

  const planLabel = !auth.session
    ? '未登录'
    : auth.isUnlimited
      ? `${auth.session.username} · 无限次规划`
      : auth.isVip && auth.vip
        ? `${auth.session.username} · VIP`
        : auth.freeRemaining > 0
          ? `${auth.session.username} · 本月还可规划 ${auth.freeRemaining} 次`
          : `${auth.session.username} · 本月次数已用完`;

  return (
    <div className="modal-overlay" onClick={closeVip}>
      <div className="modal max-w-[820px] overflow-hidden p-0 text-left" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={closeVip} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-lg text-text3 hover:bg-border2">
          ×
        </button>
        <div className="border-b border-border2 bg-gradient-to-b from-[#F0F6FF] to-surface px-8 py-8 text-center">
          <h2 className="mb-2 text-2xl font-extrabold text-ink">选择适合你的学习规划方案</h2>
          <p className="mx-auto mb-4 max-w-lg text-sm text-text2">免费版每月可规划 3 次，VIP 无限次规划并解锁全部高级功能</p>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs shadow ${auth.isUnlimited || auth.isVip ? 'border-premium-border bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] text-premium-name' : 'border-border bg-surface text-text2'}`}>
            当前方案：<strong>{planLabel}</strong>
          </div>
        </div>
        <div className="grid gap-4 p-7 md:grid-cols-2">
          <div className="rounded-[14px] border border-border bg-surface p-5 shadow-card">
            <h3 className="font-bold text-ink">免费版</h3>
            <p className="mb-4 text-sm text-text2">体验课表规划核心功能</p>
            <div className="mb-4 text-3xl font-extrabold text-ink">¥0<span className="text-base font-medium text-text3">/ 月</span></div>
            <ul className="mb-5 space-y-2 text-sm text-text2">
              <li>每月 3 次课程规划</li>
              <li>智能分 P 时长解析</li>
              <li>每日学习日程切分</li>
            </ul>
            <button type="button" disabled className="w-full rounded-full border border-border py-2.5 text-sm font-semibold text-text3">
              {!auth.session ? '需登录后使用' : auth.isUnlimited ? '当前方案 · 无限' : auth.freeRemaining > 0 ? `当前方案 · 剩 ${auth.freeRemaining} 次` : '本月次数已用完'}
            </button>
          </div>
          <div className="rounded-[14px] border-2 border-accent bg-gradient-to-br from-[#EFF6FF] to-surface p-5 shadow-lg">
            <h3 className="font-bold text-accent-text">VIP 会员</h3>
            <p className="mb-4 text-sm text-text2">无限规划，解锁全部功能</p>
            <div className="mb-4 text-3xl font-extrabold text-accent-text">
              ¥{CONFIG.PRICING.price}<span className="text-base font-medium text-text3">/ {CONFIG.PRICING.period}</span>
            </div>
            <ul className="mb-5 space-y-2 text-sm text-text2">
              <li>无限次课程规划</li>
              <li>高清打卡与多课程管理</li>
              <li>优先体验新功能</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                auth.setVipDemo();
                showToast('VIP 已开通（演示）');
                closeVip();
              }}
              className="btn-accent w-full"
            >
              {auth.isUnlimited ? '已是 VIP' : auth.isVip ? '续费 VIP（演示）' : '开通 VIP（演示）'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
