import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { listFeedback, submitFeedback } from '@/lib/server/feedback-service';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.nextUrl.searchParams.get('token');
}

export async function GET(req: NextRequest) {
  const payload = verifyToken(getToken(req));
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ code: -1, message: '需要管理员登录' }, { status: 401 });
  }
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get('limit')) || 50);
  return NextResponse.json({ code: 0, data: listFeedback(limit) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = submitFeedback({
      ...body,
      ua: req.headers.get('user-agent') || ''
    });
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, message: result.message });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
