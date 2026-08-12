export interface Episode {
  index: number;
  title: string;
  duration: number;
}

export interface PlanPart {
  index: number;
  title: string;
  duration: number;
  partial: boolean;
  fullEpisode: boolean;
  flexFinish?: boolean;
  startAt: number;
  endAt: number;
}

export interface PlanDay {
  day: number;
  pList: PlanPart[];
  catalogMain: string;
  catalogSub: string;
  totalSec: number;
}

export interface Course {
  bvid: string;
  title: string;
  cover: string;
  totalSeconds: number;
  episodes: Episode[];
}

export interface AuthSession {
  token: string;
  username: string;
  role: 'user' | 'admin';
  expiresAt: number;
  userId?: string;
}

export interface PlanCache {
  bvid: string;
  title: string;
  totalSeconds: number;
  pList: Episode[];
  plan: PlanDay[];
  dailyMinutes: number;
  generatedAt: string;
  coverUrl: string;
}

export interface ProgressRecord {
  completedDays: number[];
  dailyMin?: number;
  title?: string;
  cover?: string;
  updatedAt?: number;
  planSnapshot?: PlanCache;
}

export interface CatalogRange {
  main: string;
  sub: string;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}
