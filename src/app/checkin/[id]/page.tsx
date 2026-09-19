import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { checkinSnapshot } from '@/actions/checkin';
import { SessionBar } from '@/components/auth/SessionBar';
import { CheckinScreen } from '@/components/checkin/CheckinScreen';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** El día del evento: equipo, novios o planner marcan quién llegó. */
export default async function CheckinPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('admin', 'staff', 'client');
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, messages] = await Promise.all([getTranslations({ locale, namespace: 'checkin' }), getMessages({ locale })]);
  const event = await getEvent(id);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const guests = await checkinSnapshot(id);
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} locale={locale} />
      <main className="mx-auto max-w-lg px-4 py-6">
        <a href={me.role === 'client' ? `/panel/${id}${lang ? `?lang=${lang}` : ''}` : `/admin/events/${id}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {eventNames(c.couple)}</a>
        <h1 className="mb-4 mt-1 font-serif text-3xl">{t('title')}</h1>
        <NextIntlClientProvider locale={locale} messages={{ checkin: messages.checkin }}>
          <CheckinScreen eventId={id} slug={event.slug} initial={guests} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
