import { Suspense } from 'react';
import { PlanPage } from '@/components/plan/PlanPage';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-text2">加载中…</div>}>
      <PlanPage />
    </Suspense>
  );
}
