import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { SessionBar } from '@/components/auth/SessionBar';

/** Depende de la sesión: nunca se pre-renderiza. */
export const dynamic = 'force-dynamic';

/** Panel del equipo. Solo admin y staff; a los novios se les manda a /panel. */
export default async function AdminHome() {
  const me = await requireRole('admin', 'staff');
  const t = await getTranslations('auth');

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="font-serif text-3xl">Admin</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">{t('adminSoon')}</p>
      </main>
    </div>
  );
}
