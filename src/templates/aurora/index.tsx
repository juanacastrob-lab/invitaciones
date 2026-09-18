import { getMessages, getTranslations } from 'next-intl/server';
import { eventNames } from '@/lib/event-types';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/lib/config';
import type { Invitation } from '@/lib/invitations';
import { pickText, type SectionId } from '@/schemas/event-content';
import { formatDate, formatDateShort, formatInstantDate, formatTime, googleCalendarUrl, zonedToInstant } from '@/lib/dates';
import { googleMapsUrl, wazeUrl, appleMapsUrl } from '@/lib/maps';
import { Reveal } from '@/components/invitation/Reveal';
import { Countdown } from '@/components/invitation/Countdown';
import { CopyButton } from '@/components/invitation/CopyButton';
import { MusicPlayer } from '@/components/invitation/MusicPlayer';
import { RsvpForm } from '@/components/invitation/RsvpForm';
import { auroraCssVars } from './theme';

interface Props {
  invitation: Invitation;
  locale: Locale;
  /** La misma URL en la que está el invitado, para el switch de idioma. */
  path: string;
  /** Solo en el link personal. */
  token?: string;
  /** En /dev/preview no hay base: el formulario simula el guardado. */
  previewMode?: boolean;
}

// -----------------------------------------------------------------------------
// Piezas compartidas
// -----------------------------------------------------------------------------

function Section({
  title,
  children,
  tight = false,
}: {
  title?: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <section className={`px-6 ${tight ? 'py-10' : 'py-14'}`}>
      <div className="mx-auto w-full max-w-md">
        <Reveal>
          {title ? (
            <h2 className="mb-7 text-center text-[0.7rem] uppercase tracking-[0.3em] text-[var(--muted)]">
              {title}
            </h2>
          ) : null}
          {children}
        </Reveal>
      </div>
    </section>
  );
}

function Divider() {
  return <div className="mx-auto h-px w-12 bg-[var(--line)]" />;
}

function LinkButton({
  href,
  children,
  external = true,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {children}
    </a>
  );
}

// -----------------------------------------------------------------------------
// Plantilla
// -----------------------------------------------------------------------------

export async function AuroraTemplate({ invitation, locale, path, token, previewMode }: Props) {
  const t = await getTranslations({ locale, namespace: 'invitation' });
  const messages = await getMessages({ locale });
  const { event, guest, access } = invitation;
  const c = event.content;
  const tz = event.timezone;
  const text = (v: Parameters<typeof pickText>[0]) => pickText(v, locale);

  const otherLocale = event.languages.find((l) => l !== locale);
  const coupleNames = eventNames(c.couple);

  const sections: Record<SectionId, React.ReactNode> = {
    // -------------------------------------------------------------- portada
    cover: (
      <section
        key="cover"
        className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        {c.cover?.photo ? (
          <>
            <img
              src={c.cover.photo.url}
              alt={text(c.cover.photo.alt) ?? ''}
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-[var(--paper)]/55" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 80% at 50% 0%, var(--accent-soft) 0%, var(--paper) 60%)',
            }}
          />
        )}

        <div className="relative">
          {text(c.cover?.headline) ? (
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--muted)]">
              {text(c.cover?.headline)}
            </p>
          ) : null}

          {/* Cada nombre en su renglón: "Juan Antonio" nunca se parte a la mitad. */}
          <h1 className="mt-6 flex flex-col items-center font-serif text-[2.75rem] leading-[1.1] text-[var(--ink)] sm:text-6xl">
            <span>{c.couple.partnerA}</span>
            {c.couple.partnerB ? (
              <>
                <span className="my-1 text-3xl text-[var(--accent)] sm:text-4xl" aria-hidden>&</span>
                <span>{c.couple.partnerB}</span>
              </>
            ) : null}
          </h1>

          <div className="mt-7 flex items-center justify-center gap-4">
            <Divider />
            <span className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--muted)]">
              {formatDateShort(c.startsAt, tz, locale)}
            </span>
            <Divider />
          </div>

          {text(c.cover?.tagline) ? (
            <p className="mt-5 text-sm text-[var(--muted)]">{text(c.cover?.tagline)}</p>
          ) : null}

          {c.music ? (
            <div className="mt-8">
              <MusicPlayer
                url={c.music.url}
                title={c.music.title}
                playLabel={t('music.play')}
                pauseLabel={t('music.pause')}
              />
            </div>
          ) : null}
        </div>
      </section>
    ),

    // --------------------------------------------------------- cuenta atrás
    countdown: (
      <Section key="countdown" title={text(c.countdown?.label)} tight>
        <Countdown
          targetIso={zonedToInstant(c.startsAt, tz).toISOString()}
          labels={{
            days: t('countdown.days'),
            hours: t('countdown.hours'),
            minutes: t('countdown.minutes'),
            seconds: t('countdown.seconds'),
            today: t('countdown.today'),
            past: t('countdown.past'),
          }}
        />
      </Section>
    ),

    // ------------------------------------------------------ nuestra historia
    story: c.story ? (
      <Section key="story" title={text(c.story.title)}>
        {c.story.photo ? (
          <img
            src={c.story.photo.url}
            alt={text(c.story.photo.alt) ?? ''}
            loading="lazy"
            className="mb-6 aspect-[4/5] w-full rounded-sm object-cover"
          />
        ) : null}
        <p className="text-center text-[0.95rem] leading-relaxed text-[var(--ink)]/80">
          {text(c.story.body)}
        </p>
      </Section>
    ) : null,

    // ------------------------------------------------------------ itinerario
    itinerary: c.itinerary ? (
      <Section key="itinerary" title={text(c.itinerary.title)}>
        <ol className="space-y-9">
          {c.itinerary.acts.map((act) => (
            <li key={act.id} className="text-center">
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--accent)]">
                {text(act.title) ?? t(`acts.${act.kind}`)}
              </p>

              <p className="mt-3 font-serif text-2xl text-[var(--ink)]">
                {formatTime(act.startsAt, tz, locale)}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatDate(act.startsAt, tz, locale)}
              </p>

              <p className="mt-4 text-sm font-medium text-[var(--ink)]">{act.venue.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {act.venue.address}
              </p>

              {text(act.note) ? (
                <p className="mt-3 text-xs italic text-[var(--muted)]">{text(act.note)}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <LinkButton href={googleMapsUrl(act.venue)}>{t('maps.google')}</LinkButton>
                <LinkButton href={wazeUrl(act.venue)}>{t('maps.waze')}</LinkButton>
                <LinkButton href={appleMapsUrl(act.venue)}>{t('maps.apple')}</LinkButton>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <p className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-[var(--muted)]">
            {t('calendar.add')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton
              href={googleCalendarUrl({
                title: coupleNames,
                startsAt: c.startsAt,
                timeZone: tz,
                location: c.itinerary.acts[0]?.venue.address,
                uid: `${event.slug}@holaboda`,
              })}
            >
              {t('calendar.google')}
            </LinkButton>
            <LinkButton href={`/i/${event.slug}/calendar.ics`} external={false}>
              {t('calendar.ics')}
            </LinkButton>
          </div>
        </div>
      </Section>
    ) : null,

    // ---------------------------------------------------- código de vestimenta
    dressCode: c.dressCode ? (
      <Section key="dressCode" title={text(c.dressCode.title)}>
        <p className="text-center font-serif text-3xl text-[var(--ink)]">
          {text(c.dressCode.code)}
        </p>

        {c.dressCode.palette?.length ? (
          <div className="mt-5 flex justify-center gap-3">
            {c.dressCode.palette.map((color) => (
              <span
                key={color}
                className="h-8 w-8 rounded-full ring-1 ring-[var(--line)]"
                style={{ backgroundColor: color }}
                aria-hidden
              />
            ))}
          </div>
        ) : null}

        {text(c.dressCode.notes) ? (
          <p className="mt-6 text-center text-sm leading-relaxed text-[var(--muted)]">
            {text(c.dressCode.notes)}
          </p>
        ) : null}
      </Section>
    ) : null,

    // ------------------------------------------------------------- sin niños
    noKids: c.noKids ? (
      <Section key="noKids" title={t('noKids.title')} tight>
        <p className="text-center text-sm leading-relaxed text-[var(--muted)]">
          {text(c.noKids.note)}
        </p>
      </Section>
    ) : null,

    // -------------------------------------------------------- mesa de regalos
    gifts: c.gifts ? (
      <Section key="gifts" title={text(c.gifts.title)}>
        {text(c.gifts.note) ? (
          <p className="mb-6 text-center text-sm leading-relaxed text-[var(--muted)]">
            {text(c.gifts.note)}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          {c.gifts.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-sm border border-[var(--line)] px-4 py-3 text-center text-sm text-[var(--ink)] transition-colors hover:border-[var(--accent)]"
            >
              {text(link.label)}
            </a>
          ))}
        </div>

        {/* Solo llega hasta aquí en el link personal: la base lo quita del resto. */}
        {c.gifts.bank ? (
          <div className="mt-6 rounded-sm bg-[var(--accent-soft)] p-5 text-sm">
            {text(c.gifts.bank.note) ? (
              <p className="mb-4 text-center text-xs leading-relaxed text-[var(--muted)]">
                {text(c.gifts.bank.note)}
              </p>
            ) : null}

            <dl className="space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">{t('gifts.bank')}</dt>
                <dd className="text-right text-[var(--ink)]">{c.gifts.bank.bank}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">{t('gifts.holder')}</dt>
                <dd className="text-right text-[var(--ink)]">{c.gifts.bank.holder}</dd>
              </div>
              {c.gifts.bank.clabe ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--muted)]">{t('gifts.clabe')}</dt>
                  <dd className="flex items-center gap-2">
                    <span className="tabular-nums text-[var(--ink)]">{c.gifts.bank.clabe}</span>
                    <CopyButton
                      value={c.gifts.bank.clabe}
                      label={t('gifts.copy')}
                      copiedLabel={t('gifts.copied')}
                    />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {c.gifts.envelopes ? (
          <p className="mt-4 text-center text-xs text-[var(--muted)]">{t('gifts.envelopes')}</p>
        ) : null}
      </Section>
    ) : null,

    // ------------------------------------------------------------- hospedaje
    lodging: c.lodging ? (
      <Section key="lodging" title={text(c.lodging.title)}>
        <ul className="space-y-6">
          {c.lodging.options.map((hotel) => (
            <li key={hotel.name} className="text-center">
              <p className="font-serif text-xl text-[var(--ink)]">{hotel.name}</p>
              {text(hotel.note) ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                  {text(hotel.note)}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {hotel.url ? <LinkButton href={hotel.url}>{t('lodging.site')}</LinkButton> : null}
                {hotel.phone ? (
                  <LinkButton href={`tel:${hotel.phone}`}>{t('lodging.call')}</LinkButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    ) : null,

    // --------------------------------------------------------------- galería
    gallery: c.gallery ? (
      <Section key="gallery" title={text(c.gallery.title)}>
        <div className="grid grid-cols-2 gap-2">
          {c.gallery.photos.map((photo) => (
            <img
              key={photo.url}
              src={photo.url}
              alt={text(photo.alt) ?? ''}
              loading="lazy"
              className="aspect-square w-full rounded-sm object-cover"
            />
          ))}
        </div>
      </Section>
    ) : null,

    // ----------------------------------------------------------------- música
    music: null, // vive en la portada, no ocupa sección propia

    // ------------------------------------------------------------------- FAQ
    faq: c.faq ? (
      <Section key="faq" title={text(c.faq.title)}>
        <div className="divide-y divide-[var(--line)]">
          {c.faq.items.map((item) => (
            <details key={text(item.q)} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-[var(--ink)]">
                {text(item.q)}
                <span className="text-[var(--muted)] transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{text(item.a)}</p>
            </details>
          ))}
        </div>
      </Section>
    ) : null,

    // ------------------------------------------------------------------ RSVP
    rsvp: (
      <Section key="rsvp" title={text(c.rsvp?.title)}>
        {text(c.rsvp?.note) ? (
          <p className="mb-6 text-center text-sm leading-relaxed text-[var(--muted)]">
            {text(c.rsvp?.note)}
          </p>
        ) : null}

        {guest && token ? (
          <NextIntlClientProvider locale={locale} messages={{ invitation: messages.invitation }}>
            <RsvpForm
              slug={event.slug}
              token={token}
              guest={guest}
              locale={locale}
              closed={Boolean(event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date())}
              privacyHref={`/legal/privacidad?lang=${locale}`}
              previewMode={previewMode}
              config={{
                askMenu: c.rsvp?.askMenu ?? false,
                menuOptions: (c.rsvp?.menuOptions ?? []).map((o) => ({
                  id: o.id,
                  label: text(o.label) ?? o.id,
                })),
                askDietary: c.rsvp?.askDietary ?? false,
                askSong: c.rsvp?.askSong ?? false,
                askMessage: c.rsvp?.askMessage ?? true,
              }}
            />
          </NextIntlClientProvider>
        ) : (
          <div className="rounded-sm bg-[var(--accent-soft)] p-6 text-center">
            <p className="text-sm font-medium text-[var(--ink)]">{t('generalNotice.title')}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              {t('generalNotice.body')}
            </p>
          </div>
        )}

        {event.rsvp_deadline ? (
          <p className="mt-5 text-center text-xs text-[var(--muted)]">
            {t('rsvp.deadline', { date: formatInstantDate(event.rsvp_deadline, tz, locale) })}
          </p>
        ) : null}
      </Section>
    ),
  };

  return (
    <div
      style={auroraCssVars}
      className="min-h-dvh bg-[var(--paper)] font-sans text-[var(--ink)] antialiased"
    >
      {/* Barra del invitado: quién es y cuántos pases trae. */}
      {access === 'token' && guest ? (
        <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 px-6 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <p className="truncate text-xs text-[var(--ink)]">
              {guest.display_name}
              <span className="mx-2 text-[var(--line)]">·</span>
              <span className="text-[var(--muted)]">
                {t('guestBanner.passes', { count: guest.passes })}
              </span>
            </p>
            {otherLocale ? (
              <a
                href={`${path}?lang=${otherLocale}`}
                className="shrink-0 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)] underline underline-offset-4"
              >
                {t('language.switch')}
              </a>
            ) : null}
          </div>
        </div>
      ) : otherLocale ? (
        <div className="absolute right-4 top-4 z-20">
          <a
            href={`${path}?lang=${otherLocale}`}
            className="rounded-full bg-[var(--paper)]/80 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)] backdrop-blur"
          >
            {t('language.switch')}
          </a>
        </div>
      ) : null}

      <main>{c.sectionOrder.map((id) => sections[id])}</main>

      <footer className="px-6 pb-10 pt-4 text-center">
        <p className="font-serif text-lg text-[var(--muted)]">{coupleNames}</p>
      </footer>
    </div>
  );
}
