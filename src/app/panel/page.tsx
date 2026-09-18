import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { listMyEvents } from '@/lib/admin/queries';
import { SessionBar } from '@/components/auth/SessionBar';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** Panel de los novios. Si solo tienen un evento (lo normal), van directo a él. */
export default async function PanelHome({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'panel' });
  const events = await listMyEvents();

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-serif text-3xl">{t('title')}</h1>
        {!events.length ? (
          <p className="mt-4 text-sm leading-relaxed text-stone-500">{t('noEvents')}</p>
        ) : (
          <ul className="mt-6 divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
            {events.map((e) => {
              const c = e.content as unknown as EventContent;
              return (
                <li key={e.id}>
                  <a href={`/panel/${e.id}${lang ? `?lang=${lang}` : ''}`} className="block p-4 hover:bg-stone-50">
                    <p className="font-serif text-xl">{c.couple.partnerA} &amp; {c.couple.partnerB}</p>
                    <p className="text-xs text-stone-500">{c.startsAt.slice(0, 10)} · {e.stats.confirmed_people}/{e.stats.passes} {t('passes')}</p>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
