import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/config';
import type { Invitation } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { eventNames } from '@/lib/event-types';
import { resolveTemplate, templateCssVars } from '@/templates/registry';

/** Agradecimiento en el link personal: foto, "gracias, {nombre}" y el texto de los novios. */
export async function ThankYouView({ invitation, locale, backHref }: { invitation: Invitation; locale: Locale; backHref: string }) {
  const t = await getTranslations({ locale, namespace: 'invitation' });
  const { event, guest } = invitation;
  const c = event.content;
  const ty = c.thankYou;
  const theme = resolveTemplate(event.template, c.colors);
  const heading = theme.heading === 'sans' ? 'font-sans font-light tracking-tight' : 'font-serif';
  const radius = theme.radius === 'xl' ? 'rounded-2xl' : 'rounded-sm';
  const text = (v: Parameters<typeof pickText>[0]) => pickText(v, locale);
  const photo = ty?.photo ?? c.gallery?.photos[0] ?? c.cover?.photo;

  return (
    <div style={templateCssVars(theme)} className="min-h-dvh bg-[var(--paper)] font-sans text-[var(--ink)] antialiased">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        {photo ? <img src={photo.url} alt={text(photo.alt) ?? ''} className={`mb-8 aspect-[4/5] w-full max-w-xs object-cover shadow-lg ${radius}`} /> : null}
        <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--muted)]">{text(ty?.title) ?? t('thankYou.default')}</p>
        <h1 className={`mt-5 ${heading} text-3xl leading-tight text-[var(--ink)]`}>
          {guest ? t('thankYou.hello', { name: guest.display_name }) : t('thankYou.default')}
        </h1>
        {text(ty?.body) ? <p className="mt-6 whitespace-pre-line text-[0.95rem] leading-relaxed text-[var(--ink)]/80">{text(ty?.body)}</p> : null}
        <p className={`mt-10 ${heading} text-xl text-[var(--muted)]`}>{eventNames(c.couple)}</p>
        <a href={backHref} className="mt-8 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)] underline underline-offset-4">{t('thankYou.back')}</a>
      </main>
    </div>
  );
}
