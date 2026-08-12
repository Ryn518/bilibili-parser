import { NextRequest, NextResponse } from 'next/server';
import { handleLogin, handleMe, handleRegister } from '@/lib/server/auth-service';

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'me';
  try {
    if (action !== 'me') {
      return NextResponse.json({ code: -1, message: '不支持的请求' }, { status: 405 });
    }
    const token = getBearerToken(req) || req.nextUrl.searchParams.get('token') || '';
    const result = handleMe(token);
    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    return NextResponse.json({ code: 0, data: result.data });
  } catch (err) {
    const error = err as Error;
    const msg = error.message?.includes('AUTH_SECRET')
      ? '服务器未正确配置，请联系开发者'
      : error.message || '服务器错误';
    return NextResponse.json({ code: -1, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'login';
  try {
    const body = await req.json();
    let result;

    if (action === 'login') {
      result = handleLogin(body.username, body.password, body.authRecord);
    } else if (action === 'register') {
      result = handleRegister(body.username, body.password);
    } else {
      return NextResponse.json({ code: -1, message: '未知 action' }, { status: 400 });
    }

    if (result.error) {
      return NextResponse.json({ code: -1, message: result.error }, { status: result.status });
    }
    const payload =
      'authRecord' in result && result.authRecord
        ? { ...result.data, authRecord: result.authRecord }
        : result.data;
    return NextResponse.json({ code: 0, data: payload });
  } catch (err) {
    const error = err as Error;
    const msg = error.message?.includes('AUTH_SECRET')
      ? '服务器未正确配置，请联系开发者'
      : error.message || '服务器错误';
    return NextResponse.json({ code: -1, message: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
