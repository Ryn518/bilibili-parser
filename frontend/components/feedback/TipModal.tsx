'use client';

import { useUiStore } from '@/hooks/useUiStore';

export function TipModal() {
  const { tipOpen, closeTip } = useUiStore();
  if (!tipOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeTip}>
      <div className="modal max-w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-bold">请作者喝杯咖啡</h3>
        <p className="mb-4 text-xs leading-relaxed text-text2">
          完全自愿，扫码打赏即可。这不是会员费，不会解锁额外功能。
        </p>
        <img
          src="/wechat-tip-qr.png"
          alt="微信收款码"
          width={260}
          height={354}
          className="mx-auto w-full max-w-[260px] rounded-[12px] border border-border/60 bg-white"
        />
        <p className="mt-3 text-[0.7rem] text-text3">打开微信 · 扫一扫</p>
        <button type="button" onClick={closeTip} className="mt-4 w-full rounded-[10px] border border-border py-2.5 text-sm font-semibold text-text2">
          关闭
        </button>
      </div>
    </div>
  );
}
