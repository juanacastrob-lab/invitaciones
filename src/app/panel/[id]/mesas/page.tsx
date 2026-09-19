import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireRole } from '@/lib/auth';
import { getEvent, listGuests, listTables } from '@/lib/admin/queries';
import { SessionBar } from '@/components/auth/SessionBar';
import { TablesManager } from '@/components/admin/TablesManager';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** Mesas para los novios y el planner. Se pueden mover en cualquier estado del evento. */
export default async function PanelTablesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, messages, event, guests, tables] = await Promise.all([getTranslations({ locale, namespace: 'tables' }), getMessages({ locale }), getEvent(id), listGuests(id), listTables(id)]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} locale={locale} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <a href={`/panel/${id}${lang ? `?lang=${lang}` : ''}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {eventNames(c.couple)}</a>
        <h1 className="mb-6 mt-2 font-serif text-3xl">{t('title')}</h1>
        <NextIntlClientProvider locale={locale} messages={{ tables: messages.tables }}>
          <TablesManager eventId={id} tables={tables} guests={guests} exportHref={`/admin/events/${id}/tables/export.csv`} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
