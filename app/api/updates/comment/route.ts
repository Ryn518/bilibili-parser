import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { addUpdateComment, deleteUpdateComment } from '@/lib/server/updates-service';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = verifyToken(getToken(req));
    const result = await addUpdateComment({
      updateId: body.updateId,
      content: body.content,
      username: payload?.username || body.username
    });
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, data: result.comment, message: '评论已发布' });
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
  const result = deleteUpdateComment(
    req.nextUrl.searchParams.get('updateId') || '',
    req.nextUrl.searchParams.get('commentId') || ''
  );
  if (result.error) {
    return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
  }
  return NextResponse.json({ code: 0, message: '已删除评论' });
}
