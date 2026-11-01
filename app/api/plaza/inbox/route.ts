import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth-service';
import { listPlazaInbox } from '@/lib/server/plaza-service';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload?.username) {
    return NextResponse.json({ code: -1, message: '请先登录' }, { status: 401 });
  }
  const items = listPlazaInbox(payload.username);
  return NextResponse.json({ code: 0, data: { items, total: items.length } });
}
