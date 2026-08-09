export const CONFIG = {
  PRICING: { price: 9.9, period: '月', days: 30 },
  FREE_PLAN_LIMIT: 3,
  USAGE_KEY: 'bili-planner-usage',
  AUTH_SESSION_KEY: 'bili-planner-session',
  VIP_KEY: 'bili-planner-vip',
  STORAGE_KEY: 'bili-planner-v1',
  PLAN_CACHE_KEY: 'bili-planner-plan-cache',
  CONTINUE_DISMISS_KEY: 'bili-planner-continue-dismiss',
  PWA_DISMISS_KEY: 'bili-planner-pwa-dismiss',
  PLAN_EXPIRE_DAYS: 7,
  CACHE_TTL: 30 * 60 * 1000,
  ALIPAY_QR_URL: '',
  VIP_QR_URL: 'https://via.placeholder.com/200x200/2563EB/FFFFFF?text=VIP'
} as const;
