import { NextRequest, NextResponse } from 'next/server';
import { requireSyncUser } from '@/lib/server/auth-service';
import { deleteUserCourse, pullUserSync, pushUserSync } from '@/lib/server/sync-service';
import type { CloudSyncPayload } from '@/lib/server/sync-service';

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireSyncUser(getBearerToken(req));
    if ('error' in auth) {
      return NextResponse.json({ code: -1, message: auth.error }, { status: auth.status });
    }
    const data = await pullUserSync(auth.payload.userId!);
    return NextResponse.json({ code: 0, data });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '同步失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requireSyncUser(getBearerToken(req));
    if ('error' in auth) {
      return NextResponse.json({ code: -1, message: auth.error }, { status: auth.status });
    }
    const body = (await req.json()) as CloudSyncPayload;
    await pushUserSync(auth.payload.userId!, {
      progress: body.progress || {},
      planCache: body.planCache ?? null,
      continueDismiss: body.continueDismiss || {},
      syncedAt: body.syncedAt || Date.now()
    });
    return NextResponse.json({ code: 0, message: '已同步' });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '同步失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireSyncUser(getBearerToken(req));
    if ('error' in auth) {
      return NextResponse.json({ code: -1, message: auth.error }, { status: auth.status });
    }
    const bvid = req.nextUrl.searchParams.get('bvid')?.trim();
    if (!bvid) {
      return NextResponse.json({ code: -1, message: '缺少 bvid' }, { status: 400 });
    }
    await deleteUserCourse(auth.payload.userId!, bvid);
    return NextResponse.json({ code: 0, message: '已删除' });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ code: -1, message: error.message || '删除失败' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
