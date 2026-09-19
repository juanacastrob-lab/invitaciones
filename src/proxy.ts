import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Corre antes de cada página protegida. Dos trabajos:
 *  1. Refrescar la sesión de Supabase (las cookies caducan y hay que renovarlas).
 *  2. Mandar a /login a quien no tenga sesión.
 *
 * Solo revisa que HAYA sesión. El rol (admin, staff, client) se decide en la
 * página, contra la base, porque aquí no hay que consultar nada pesado.
 *
 * Se limita a /admin, /panel y /login con `matcher`: las invitaciones públicas
 * no pasan por aquí, no gastan una función extra por visita.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLogin = path === '/login';

  if (!user && !isLogin) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/panel/:path*', '/login'],
};
