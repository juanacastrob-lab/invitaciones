import { notFound } from 'next/navigation';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { SessionBar } from '@/components/auth/SessionBar';
import { ContentEditor } from '@/components/editor/ContentEditor';
import { isLocale, DEFAULT_LOCALE, WHATSAPP_NUMBER, whatsappLink, type Locale } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** Editor para los novios y el planner. Solo guarda en borrador o en revisión. */
export default async function PanelContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, tp, messages, event] = await Promise.all([
    getTranslations({ locale, namespace: 'editor' }),
    getTranslations({ locale, namespace: 'panel' }),
    getMessages({ locale }),
    getEvent(id),
  ]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const editable = event.status === 'borrador' || event.status === 'en_revision' || me.role !== 'client';
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <a href={`/panel/${id}${lang ? `?lang=${lang}` : ''}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {c.couple.partnerA} &amp; {c.couple.partnerB}</a>
        <h1 className="mb-6 mt-2 font-serif text-3xl">{t('title')}</h1>
        {editable ? (
          <NextIntlClientProvider locale={locale} messages={{ editor: messages.editor }}>
            <ContentEditor eventId={id} content={c} languages={event.languages as Locale[]} previewHref={`/i/${event.slug}?preview=${event.preview_key}`} />
          </NextIntlClientProvider>
        ) : (
          <p className="text-sm text-stone-600">
            {tp('readOnly')} <a className="underline" href={whatsappLink(`Hola, somos ${c.couple.partnerA} y ${c.couple.partnerB}, queremos un cambio en nuestra invitación.`)} target="_blank" rel="noopener noreferrer">{WHATSAPP_NUMBER}</a>
          </p>
        )}
      </main>
    </div>
  );
}
