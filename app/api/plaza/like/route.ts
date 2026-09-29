import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { togglePlazaLike } from '@/lib/server/plaza-service';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload?.username) {
      return NextResponse.json({ code: -1, message: '请先登录后再点赞' }, { status: 401 });
    }
    const body = await req.json();
    const result = togglePlazaLike(String(body.postId || ''), `u:${payload.username}`, body.commentId ? String(body.commentId) : undefined);
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, data: result.post });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '服务器错误' }, { status: 500 });
  }
}
