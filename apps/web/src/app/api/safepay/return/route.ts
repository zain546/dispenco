import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let tracker = req.nextUrl.searchParams.get('beacon') || req.nextUrl.searchParams.get('tracker') || '';
    
    // Attempt to extract tracker from form body if sent as POST
    try {
      const formData = await req.formData();
      tracker = (formData.get('tracker') as string) || (formData.get('beacon') as string) || tracker;
    } catch {
      // Body may be JSON or empty
    }

    const redirectUrl = new URL(
      `/settings?tab=billing&status=success${tracker ? `&beacon=${encodeURIComponent(tracker)}` : ''}`,
      req.url
    );
    return NextResponse.redirect(redirectUrl, 303);
  } catch {
    const redirectUrl = new URL('/settings?tab=billing&status=success', req.url);
    return NextResponse.redirect(redirectUrl, 303);
  }
}

export async function GET(req: NextRequest) {
  const tracker = req.nextUrl.searchParams.get('beacon') || req.nextUrl.searchParams.get('tracker') || '';
  const redirectUrl = new URL(
    `/settings?tab=billing&status=success${tracker ? `&beacon=${encodeURIComponent(tracker)}` : ''}`,
    req.url
  );
  return NextResponse.redirect(redirectUrl, 303);
}

