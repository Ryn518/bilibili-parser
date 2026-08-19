import type { PlanDay } from './types';

/** Postgres JSONB 偶发 object 形态，统一成数组 */
export function normalizePlanDays(plan: unknown): PlanDay[] {
  if (Array.isArray(plan)) return plan as PlanDay[];
  if (plan && typeof plan === 'object') {
    return Object.values(plan as Record<string, PlanDay>).filter(Boolean);
  }
  return [];
}
