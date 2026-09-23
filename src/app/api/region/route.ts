import { NextResponse } from 'next/server';
import { isRegion } from '@/lib/event-types';
import { REGION_COOKIE } from '@/lib/region';

export const dynamic = 'force-dynamic';

/** El botón de región: guarda la elección un año y regresa a la página. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get('to')?.toUpperCase();
  const next = url.searchParams.get('next') ?? '/comprar';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/comprar';
  const res = NextResponse.redirect(new URL(safeNext, url.origin), 303);
  if (isRegion(to)) res.cookies.set(REGION_COOKIE, to, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return res;
}
