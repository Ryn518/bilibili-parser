import { Suspense } from 'react';
import { PlanPage } from '@/components/plan/PlanPage';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1180px] px-5 py-16 text-center text-text2">加载中…</div>}>
      <PlanPage />
    </Suspense>
  );
}
