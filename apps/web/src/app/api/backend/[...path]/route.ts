import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendFetch,
  refreshSession,
  responseTokens,
  writeSession,
} from '@/lib/server/backend';
import type { SessionTokens } from '@/lib/server/backend';

export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (path.some((part) => !part || part === '.' || part === '..' || /[\\/?#%]/.test(part)))
    return NextResponse.json({ message: 'Invalid API path' }, { status: 400 });
  const endpoint = path.join('/');
  const mutation = !['GET', 'HEAD'].includes(request.method);
  if (
    mutation &&
    (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site')
  ) {
    return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
  }
  const publicAuth = ['auth/login', 'auth/signup'].includes(endpoint) && request.method === 'POST';
  if (endpoint === 'auth/refresh')
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  let tokens: SessionTokens = {
    access: request.cookies.get(ACCESS_COOKIE)?.value,
    refresh: request.cookies.get(REFRESH_COOKIE)?.value,
  };
  const logout = endpoint === 'auth/logout' && request.method === 'POST';
  try {
    if (!publicAuth && !tokens.access && tokens.refresh)
      tokens = (await refreshSession(tokens.refresh)) || {};
    if (!publicAuth && !tokens.access)
      return writeSession(
        NextResponse.json({ message: 'Please sign in again' }, { status: logout ? 200 : 401 }),
        null,
      );
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    const body = mutation ? await request.arrayBuffer() : undefined;
    const send = () => {
      if (!publicAuth && tokens.access) headers.set('Authorization', `Bearer ${tokens.access}`);
      return backendFetch(`${endpoint}${request.nextUrl.search}`, {
        method: request.method,
        headers,
        body,
      });
    };
    let upstream = await send();
    if (!publicAuth && upstream.status === 401 && tokens.refresh) {
      tokens = (await refreshSession(tokens.refresh)) || {};
      if (tokens.access) upstream = await send();
    }
    if (logout) {
      if (!upstream.ok && upstream.status !== 401) throw new Error('Unable to revoke session');
      return writeSession(NextResponse.json({ success: true }), null);
    }
    if (publicAuth && upstream.ok) {
      const data = await upstream.json();
      if (typeof data.accessToken !== 'string') throw new Error('Invalid session response');
      tokens = responseTokens(upstream, data.accessToken);
      if (!tokens.refresh) throw new Error('Missing refresh session');
      delete data.accessToken;
      return writeSession(NextResponse.json(data, { status: upstream.status }), tokens);
    }
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'private, no-store',
      },
    });
    const disposition = upstream.headers.get('content-disposition');
    if (disposition) response.headers.set('Content-Disposition', disposition);
    return writeSession(response, upstream.status === 401 && !publicAuth ? null : tokens);
  } catch {
    return NextResponse.json(
      { message: 'The service is temporarily unavailable. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '30' } },
    );
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
