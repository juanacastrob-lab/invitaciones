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

  const supabase = await supabaseServer();

  if (code) {
    // Google, Apple y el magic link abierto en el MISMO navegador donde se pidió.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    console.error('[auth] no se pudo canjear el código:', error.message);
  }

  // Magic link abierto en otro dispositivo (pedido en la compu, abierto en el
  // celular): no hay cookie de verificación, así que se valida por token_hash.
  // Requiere que la plantilla de correo de Supabase mande token_hash y type.
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && (type === 'magiclink' || type === 'email')) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    console.error('[auth] token_hash inválido o vencido:', error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
