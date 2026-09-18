import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Adonde regresan Google, Apple y el link del correo después de autenticar.
 * Cambia el código de un solo uso por una sesión en cookies y manda al panel.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    console.error('[auth] no se pudo canjear el código:', error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
