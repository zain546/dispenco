import 'server-only';
import { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'dispenco_access_token';
export const REFRESH_COOKIE = 'refresh_token';
export type SessionTokens = { access?: string; refresh?: string };

export function backendUrl(path: string): string {
  const base =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  return `${base.replace(/\/$/, '')}/${path}`;
}

export function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(backendUrl(path), {
    ...init,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
}

export function writeSession(response: NextResponse, tokens: SessionTokens | null) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  if (!tokens || tokens.access)
    response.cookies.set(ACCESS_COOKIE, tokens?.access || '', {
      ...options,
      maxAge: tokens ? 900 : 0,
    });
  if (!tokens || tokens.refresh)
    response.cookies.set(REFRESH_COOKIE, tokens?.refresh || '', {
      ...options,
      maxAge: tokens ? 30 * 86400 : 0,
    });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export function responseTokens(response: Response, access: string): SessionTokens {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${REFRESH_COOKIE}=`));
  return { access, refresh: cookie?.split(';')[0].slice(REFRESH_COOKIE.length + 1) };
}

export async function refreshSession(refresh: string): Promise<SessionTokens | null> {
  const response = await backendFetch('auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Session service unavailable');
  const data = await response.json();
  if (typeof data.accessToken !== 'string') throw new Error('Invalid session response');
  return responseTokens(response, data.accessToken);
}

export async function verifiedSession(tokens: SessionTokens) {
  let current = tokens;
  let response = current.access
    ? await backendFetch('auth/me', { headers: { Authorization: `Bearer ${current.access}` } })
    : null;
  if ((!response || response.status === 401) && current.refresh) {
    const renewed = await refreshSession(current.refresh);
    if (!renewed) return null;
    current = { ...current, ...renewed };
    response = await backendFetch('auth/me', {
      headers: { Authorization: `Bearer ${current.access}` },
    });
  }
  if (!response || response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Session service unavailable');
  const data = await response.json();
  if (!data.user?.id || !data.user?.tenantId) throw new Error('Invalid session response');
  return {
    user: data.user as { id: string; tenantId: string; role?: string; permissions?: string[] },
    tokens: current,
  };
}
