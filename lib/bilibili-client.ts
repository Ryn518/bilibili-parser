import type { Course } from './types';

export async function fetchCourse(bvid: string): Promise<Course> {
  const res = await fetch(`/api/bilibili?bvid=${encodeURIComponent(bvid)}&type=course`, {
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `后端 HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== 0 || !json.data?.episodes?.length) {
    throw new Error(json.message || '后端返回数据无效');
  }
  return json.data as Course;
}
