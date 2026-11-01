import { NextRequest, NextResponse } from 'next/server';
import { canAccessPage, isProtectedPath, safeReturnPath } from '@/lib/auth-policy';
import { ACCESS_COOKIE, REFRESH_COOKIE, verifiedSession, writeSession } from '@/lib/server/backend';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const guestOnly = path === '/login' || path === '/signup';
  if (!isProtectedPath(path) && !guestOnly) return NextResponse.next();
  const tokens = {
    access: request.cookies.get(ACCESS_COOKIE)?.value,
    refresh: request.cookies.get(REFRESH_COOKIE)?.value,
  };
  if (guestOnly && !tokens.access && !tokens.refresh) return NextResponse.next();
  try {
    const session = await verifiedSession(tokens);
    if (!session) {
      if (guestOnly) return writeSession(NextResponse.next(), null);
      const url = new URL('/login', request.url);
      url.searchParams.set('next', safeReturnPath(`${path}${request.nextUrl.search}`));
      return writeSession(NextResponse.redirect(url), null);
    }
    if (guestOnly)
      return writeSession(
        NextResponse.redirect(
          new URL(safeReturnPath(request.nextUrl.searchParams.get('next')), request.url),
        ),
        session.tokens,
      );
    if (!canAccessPage(path, session.user)) {
      return new NextResponse('You do not have permission to access this page.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    request.cookies.set(ACCESS_COOKIE, session.tokens.access!);
    const headers = new Headers(request.headers);
    headers.set('cookie', request.cookies.toString());
    return writeSession(NextResponse.next({ request: { headers } }), session.tokens);
  } catch {
    return new NextResponse('We cannot verify your session right now. Please try again shortly.', {
      status: 503,
      headers: { 'Retry-After': '30', 'Cache-Control': 'private, no-store' },
    });
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)',
  ],
};
