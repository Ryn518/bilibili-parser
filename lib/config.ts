export const CONFIG = {
  AUTH_SESSION_KEY: 'bili-planner-session',
  STORAGE_KEY: 'bili-planner-v1',
  PLAN_CACHE_KEY: 'bili-planner-plan-cache',
  CONTINUE_DISMISS_KEY: 'bili-planner-continue-dismiss',
  GUEST_PLAN_KEY: 'bili-guest-plan-cache',
  GUEST_PROGRESS_KEY: 'bili-guest-progress',
  GUEST_DISMISS_KEY: 'bili-guest-continue-dismiss',
  PLAN_EXPIRE_DAYS: 7,
  CACHE_TTL: 30 * 60 * 1000
} as const;
