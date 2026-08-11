import { NextRequest, NextResponse } from 'next/server';
import { handleBilibiliQuery } from '@/lib/server/bilibili-proxy';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  try {
    const result = await handleBilibiliQuery({
      bvid: searchParams.get('bvid'),
      aid: searchParams.get('aid'),
      url: searchParams.get('url'),
      type: searchParams.get('type')
    });
    return NextResponse.json(result);
  } catch (err) {
    const error = err as Error & { status?: number };
    console.error('[api/bilibili]', error);
    return NextResponse.json(
      { code: -1, message: error.message || '服务器内部错误' },
      { status: error.status || 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
