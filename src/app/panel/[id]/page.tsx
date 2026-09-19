import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireRole } from '@/lib/auth';
import { getEvent, listGuests, listMessages } from '@/lib/admin/queries';
import { SessionBar } from '@/components/auth/SessionBar';
import { PanelGuests } from '@/components/panel/PanelGuests';
import { ApproveBox } from '@/components/panel/ApproveBox';
import { ExpressStatus } from '@/components/panel/ExpressStatus';
import { AdjustmentRequest } from '@/components/panel/AdjustmentRequest';
import { getOrderForEvent } from '@/lib/admin/queries';
import { isExpress } from '@/lib/drafts';
import { GuestsManager } from '@/components/admin/GuestsManager';
import { Badge, LinkButton } from '@/components/ui';
import { STATUS_TONE } from '@/lib/admin/labels';
import { isLocale, DEFAULT_LOCALE, WHATSAPP_NUMBER, whatsappLink } from '@/lib/config';
import { getSiteUrl } from '@/lib/env';
import { pickText, type EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function PanelEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, messages, event, guests, notes, order] = await Promise.all([
    getTranslations({ locale, namespace: 'panel' }),
    getMessages({ locale }),
    getEvent(id),
    listGuests(id),
    listMessages(id),
    getOrderForEvent(id),
  ]);
  if (!event) notFound();
  const express = isExpress(event.package_code ?? '');
  const pdfReady = !express || Boolean(order?.delivered_at) || Boolean(order?.deliver_at && new Date(order.deliver_at) <= new Date());
  const c = event.content as unknown as EventContent;
  const editable = event.status === 'borrador' || event.status === 'en_revision';
  const other = locale === 'es' ? 'en' : 'es';
  const questionLabel = (id: string) => pickText(c.rsvp?.questions?.find((q) => q.id === id)?.label, locale) ?? id;

  const kpis: [string, number][] = [
    [t('kpi.guests'), event.stats.guests],
    [t('kpi.passes'), event.stats.passes],
    [t('kpi.confirmed'), event.stats.confirmed_people],
    [t('kpi.declined'), event.stats.declined],
    [t('kpi.pending'), event.stats.pending],
    [t('kpi.opened'), event.stats.opened_pending],
  ];

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} locale={locale} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">{eventNames(c.couple)}</h1>
            <p className="mt-1 text-xs text-stone-500">{t('status_')}: <Badge tone={STATUS_TONE[event.status]}>{t(`eventStatus.${event.status}`)}</Badge></p>
          </div>
          <div className="flex gap-2">
            <a href={`/panel/${id}?lang=${other}`} className="self-center text-[0.65rem] uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">{other.toUpperCase()}</a>
            <LinkButton href={`/i/${event.slug}?preview=${event.preview_key}`} target="_blank">{t('openInvitation')}</LinkButton>
            <LinkButton href={`/admin/events/${id}/guests/export.csv`}>{t('export')}</LinkButton>
            {pdfReady ? <LinkButton href={`/panel/${id}/invitacion.pdf?lang=${locale}`} target="_blank">{t('downloadPdf')}</LinkButton> : null}
            <LinkButton href={`/panel/${id}/mesas${lang ? `?lang=${lang}` : ''}`}>{locale === 'es' ? 'Mesas' : 'Tables'}</LinkButton>
            {editable ? <LinkButton href={`/panel/${id}/contenido${lang ? `?lang=${lang}` : ''}`} variant="primary">{t('editContent')}</LinkButton> : null}
            {event.checkin_enabled && event.status === 'publicado' ? <LinkButton href={`/checkin/${id}${lang ? `?lang=${lang}` : ''}`}>{t('checkin')}</LinkButton> : null}
            {c.album?.enabled ? <LinkButton href={`/panel/${id}/fotos${lang ? `?lang=${lang}` : ''}`}>{t('album')}</LinkButton> : null}
          </div>
        </div>

        {event.status === 'en_revision' ? (
          <div className="mt-6">
            <NextIntlClientProvider locale={locale} messages={{ panel: messages.panel }}>
              <ApproveBox eventId={id} previewHref={`/i/${event.slug}?preview=${event.preview_key}`} editHref={`/panel/${id}/contenido${lang ? `?lang=${lang}` : ''}`} />
            </NextIntlClientProvider>
          </div>
        ) : null}

        {express ? (
          <div className="mt-6">
            <ExpressStatus deliverAt={order?.deliver_at ?? null} delivered={Boolean(order?.delivered_at)} pdfHref={`/panel/${id}/invitacion.pdf?lang=${locale}`} labels={{ building: t('express.building'), ready: t('express.ready'), download: t('downloadPdf'), sentTo: t('express.sentTo') }} />
          </div>
        ) : null}

        {event.status !== 'en_revision' && !express ? (
          <div className="mt-6 rounded-sm border border-stone-200 bg-white p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('next.title')}</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">{t(`next.${event.status}`)}</p>
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kpis.map(([label, value]) => (
            <div key={label} className="rounded-sm border border-stone-200 bg-white p-4">
              <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{label}</dt>
              <dd className="mt-1 font-serif text-3xl">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{editable ? t('editList') : t('guests')}</h2>
          {editable ? (
            <>
              <p className="mb-4 text-xs text-stone-500">{t('editListHint')}</p>
              <NextIntlClientProvider locale={locale} messages={{ guests: messages.guests }}>
                <GuestsManager eventId={id} slug={event.slug} siteUrl={getSiteUrl() ?? ''} guests={guests} templateHref={`/admin/events/${id}/guests/template.xlsx`} />
              </NextIntlClientProvider>
            </>
          ) : (
            <NextIntlClientProvider locale={locale} messages={{ panel: messages.panel }}>
              <PanelGuests guests={guests} slug={event.slug} siteUrl={getSiteUrl() ?? ''} couple={eventNames(c.couple)} />
              <p className="mt-3 text-xs text-stone-500">
                {t('readOnly')} <a className="underline" href={whatsappLink(`Hola, ${c.couple.partnerB ? 'somos' : 'soy'} ${eventNames(c.couple, ' y ')}, queremos un cambio en nuestra lista de invitados.`)} target="_blank" rel="noopener noreferrer">{WHATSAPP_NUMBER}</a>
              </p>
            </NextIntlClientProvider>
          )}
        </section>

        <div className="mt-8">
          <AdjustmentRequest eventId={id} labels={{ button: t('adjust.button'), title: t('adjust.title'), hint: t('adjust.hint'), placeholder: t('adjust.placeholder'), send: t('adjust.send'), sent: t('adjust.sent') }} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{t('messages')}</h2>
          {!notes.length ? <p className="text-sm text-stone-500">{t('noMessages')}</p> : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-sm border border-stone-200 bg-white p-4">
                  {n.message ? <p className="text-sm italic text-stone-800">“{n.message}”</p> : null}
                  {n.answers && Object.keys(n.answers).length ? <p className="mt-1 text-xs text-stone-600">{Object.entries(n.answers).map(([k, v]) => `${questionLabel(k)}: ${v}`).join(' · ')}</p> : null}
                  <p className="mt-2 text-xs text-stone-500">
                    — {n.guests.display_name}
                    {n.song ? ` · ${t('song')}: ${n.song}` : ''}{n.dietary ? ` · ${t('dietary')}: ${n.dietary}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
