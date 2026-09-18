import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { SessionBar } from '@/components/auth/SessionBar';

/** Depende de la sesión: nunca se pre-renderiza. */
export const dynamic = 'force-dynamic';

/** Panel de los novios. El equipo también puede entrar, para dar soporte. */
export default async function PanelHome() {
  const me = await requireRole('client', 'staff', 'admin');
  const t = await getTranslations('auth');

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="font-serif text-3xl">Panel</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">{t('panelSoon')}</p>
      </main>
    </div>
  );
}
