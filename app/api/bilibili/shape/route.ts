import { NextRequest, NextResponse } from 'next/server';
import { shapeCourseFromView } from '@/lib/server/bilibili-shape';

const MAX_BODY = 1_500_000;

/** 只整理插件已经取回的课程原文，不访问 B 站。 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ code: -1, message: '课程数据过大' }, { status: 413 });
  }
  let body: { data?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ code: -1, message: '课程数据无法解析' }, { status: 400 });
  }
  const view = body?.data;
  if (!view || typeof view !== 'object') {
    return NextResponse.json({ code: -1, message: '缺少课程原文' }, { status: 400 });
  }
  const bvid = String(view.bvid || '');
  if (!/^BV1[a-zA-Z0-9]{9}$/.test(bvid)) {
    return NextResponse.json({ code: -1, message: '缺少有效 BV 号' }, { status: 400 });
  }
  const course = shapeCourseFromView(view, bvid);
  if (!course) {
    return NextResponse.json({ code: -1, message: '未找到分P信息' }, { status: 422 });
  }
  return NextResponse.json({ code: 0, data: course });
}
