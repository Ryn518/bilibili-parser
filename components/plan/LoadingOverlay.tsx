'use client';

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="rounded-2xl bg-surface px-8 py-6 text-center shadow-lg">
        <p className="mb-2 text-2xl">🐕</p>
        <p className="text-sm font-medium text-ink">正在拉取课程数据…</p>
      </div>
    </div>
  );
}
