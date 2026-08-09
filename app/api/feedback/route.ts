import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/server/feedback-service';

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
