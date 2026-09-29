import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { createPlazaPost, deletePlazaPost, listPlaza } from '@/lib/server/plaza-service';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const payload = verifyToken(getToken(req));
  const voter = payload?.username ? `u:${payload.username}` : '';
  return NextResponse.json({ code: 0, data: listPlaza(voter) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = verifyToken(getToken(req));
    if (!payload?.username) {
      return NextResponse.json({ code: -1, message: '请先登录后再发布' }, { status: 401 });
    }
    const result = await createPlazaPost({
      content: body.content,
      username: payload.username,
      authorKey: `u:${payload.username}`
    });
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, data: result.post, message: '已发布到广场' });
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
  const id = req.nextUrl.searchParams.get('id') || '';
  const result = deletePlazaPost(id);
  if (result.error) {
    return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
  }
  return NextResponse.json({ code: 0, message: '已删除' });
}
