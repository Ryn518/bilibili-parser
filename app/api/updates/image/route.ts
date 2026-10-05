import { NextRequest, NextResponse } from 'next/server';
import { readUpdateImage } from '@/lib/server/updates-service';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') || '';
  const image = readUpdateImage(name);
  if (!image) {
    return NextResponse.json({ code: -1, message: '图片不存在' }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      'Content-Type': image.type,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
