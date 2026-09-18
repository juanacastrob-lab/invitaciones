import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export type Role = 'admin' | 'staff' | 'client';

export interface SessionProfile {
  userId: string;
  email: string | null;
  name: string | null;
  role: Role;
}

/**
 * Capa de acceso a datos de la sesión.
 *
 * `cache()` hace que, por más componentes que pregunten "¿quién soy?" en la
 * misma petición, a Supabase se le pregunte una sola vez.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await supabaseServer();

  // getUser() valida el token contra Supabase; getSession() solo lee la cookie.
  // Para decidir permisos, siempre el primero.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    name: profile?.name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    role: (profile?.role as Role | undefined) ?? 'client',
  };
});

/** Para páginas: manda a /login si no hay sesión, y a donde toca si el rol no alcanza. */
export async function requireRole(...allowed: Role[]): Promise<SessionProfile> {
  const me = await getSessionProfile();
  if (!me) redirect('/login');
  if (!allowed.includes(me.role)) redirect(homeFor(me.role));
  return me;
}

export function homeFor(role: Role): string {
  return role === 'client' ? '/panel' : '/admin';
}
