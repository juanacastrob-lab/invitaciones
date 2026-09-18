import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/config';
import type { SaveTheDate } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { formatDate, googleCalendarUrl, zonedToInstant } from '@/lib/dates';
import { eventNames } from '@/lib/event-types';
import { resolveTemplate, templateCssVars } from '@/templates/registry';
import { Countdown } from '@/components/invitation/Countdown';

/**
 * Save the date: una sola pantalla con la foto, los nombres, la fecha y la
 * cuenta regresiva. Sin RSVP ni detalles: eso llega con la invitación.
 */
export async function SaveTheDateView({ data, locale, path }: { data: SaveTheDate; locale: Locale; path: string }) {
  const t = await getTranslations({ locale, namespace: 'invitation' });
  const theme = resolveTemplate(data.template);
  const heading = theme.heading === 'sans' ? 'font-sans font-light tracking-tight' : 'font-serif';
  const text = (v: Parameters<typeof pickText>[0] | null) => pickText(v ?? undefined, locale);
  const other = data.languages.find((l) => l !== locale);
  const photo = data.cover?.photo;
  const names = eventNames(data.couple);

  return (
    <div style={templateCssVars(theme)} className="min-h-dvh bg-[var(--paper)] font-sans text-[var(--ink)] antialiased">
      {other ? (
        <div className="absolute right-4 top-4 z-20">
          <a href={`${path}?lang=${other}`} className="rounded-full bg-[var(--paper)]/80 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)] backdrop-blur">{t('language.switch')}</a>
        </div>
      ) : null}
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        {photo ? (
          <>
            <img src={photo.url} alt={text(photo.alt) ?? ''} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-[var(--paper)]/60" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, var(--accent-soft) 0%, var(--paper) 60%)' }} />
        )}
        <div className="relative w-full max-w-md">
          <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--muted)]">{t('saveTheDate.title')}</p>
          <h1 className={`mt-6 flex flex-col items-center ${heading} text-[2.75rem] leading-[1.1] text-[var(--ink)] sm:text-6xl`}>
            <span>{data.couple.partnerA}</span>
            {data.couple.partnerB ? (<><span className="my-1 text-3xl text-[var(--accent)]" aria-hidden>&</span><span>{data.couple.partnerB}</span></>) : null}
          </h1>
          <p className={`mt-8 ${heading} text-2xl text-[var(--ink)]`}>{formatDate(data.startsAt, data.timezone, locale)}</p>
          {data.venue ? <p className="mt-2 text-sm text-[var(--muted)]">{data.venue}</p> : null}
          <div className="mt-10">
            <Countdown targetIso={zonedToInstant(data.startsAt, data.timezone).toISOString()} labels={{ days: t('countdown.days'), hours: t('countdown.hours'), minutes: t('countdown.minutes'), seconds: t('countdown.seconds'), today: t('countdown.today'), past: t('countdown.past') }} />
          </div>
          {text(data.note) ? <p className="mt-10 text-sm leading-relaxed text-[var(--ink)]/80">{text(data.note)}</p> : null}
          <p className="mt-4 text-xs text-[var(--muted)]">{t('saveTheDate.soon')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <a href={googleCalendarUrl({ title: names, startsAt: data.startsAt, timeZone: data.timezone, location: data.venue ?? undefined, uid: `${data.slug}-std@holaboda` })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{t('calendar.google')}</a>
            <a href={`/i/${data.slug}/calendar.ics`} className="inline-flex items-center rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{t('calendar.ics')}</a>
          </div>
        </div>
      </main>
    </div>
  );
}
