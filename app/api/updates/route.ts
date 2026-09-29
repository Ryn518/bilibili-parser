import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { createUpdate, deleteUpdate, latestUpdate, listUpdates } from '@/lib/server/updates-service';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('latest') === '1') {
    return NextResponse.json({ code: 0, data: latestUpdate() });
  }
  return NextResponse.json({ code: 0, data: listUpdates() });
}

export async function POST(req: NextRequest) {
  const payload = verifyToken(getToken(req));
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ code: -1, message: '需要管理员登录' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const result = createUpdate(body);
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, data: result.update, message: '更新已发布' });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const payload = verifyToken(getToken(req));
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ code: -1, message: '需要管理员登录' }, { status: 401 });
  }
  const result = deleteUpdate(req.nextUrl.searchParams.get('id') || '');
  if (result.error) {
    return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
  }
  return NextResponse.json({ code: 0, message: '已删除' });
}
