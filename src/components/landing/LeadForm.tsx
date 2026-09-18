'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createLead } from '@/actions/lead';
import type { LeadResult } from '@/schemas/lead';
import type { Locale } from '@/lib/config';

interface PackageOption {
  code: string;
  name: string;
  priceLabel: string;
}

const field =
  'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none';
const label = 'mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-stone-500';

/**
 * El formulario de la landing. Captura lo suficiente para que el equipo arme
 * la invitación sin volver a preguntar lo básico, y los UTM del anuncio que
 * trajo a la persona (para saber qué campaña sí vende).
 */
export function LeadForm({
  locale,
  packages,
  preselected,
}: {
  locale: Locale;
  packages: PackageOption[];
  preselected?: string;
}) {
  const t = useTranslations('lead');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LeadResult | null>(null);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [packageCode, setPackageCode] = useState(preselected ?? '');

  useEffect(() => {
    if (preselected) setPackageCode(preselected);
  }, [preselected]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const picked: Record<string, string> = {};
    for (const k of ['source', 'medium', 'campaign', 'content']) {
      const v = q.get(`utm_${k}`);
      if (v) picked[k] = v.slice(0, 100);
    }
    setUtm(picked);
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      partnerA: f.get('partnerA'),
      partnerB: f.get('partnerB'),
      email: f.get('email'),
      phone: f.get('phone'),
      country: f.get('country'),
      language: f.get('language'),
      eventDate: f.get('eventDate') || '',
      city: f.get('city') || undefined,
      guestsEstimate: f.get('guestsEstimate') ? Number(f.get('guestsEstimate')) : undefined,
      packageCode: packageCode || undefined,
      message: f.get('message') || undefined,
      locale,
      consent: f.get('consent') === 'on',
      utm,
    };

    startTransition(async () => {
      setResult(await createLead(payload));
      if (result?.ok) window.scrollTo({ top: 0 });
    });
  }

  if (result?.ok) {
    return (
      <div className="rounded-sm bg-emerald-50 p-6 text-center" role="status">
        <p className="font-serif text-2xl text-stone-900">{t('done.title', { name: firstNameOf(result) })}</p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{t('done.body')}</p>
        {result.accountEmailSent ? (
          <p className="mt-2 text-xs leading-relaxed text-stone-500">{t('done.email')}</p>
        ) : null}
        <a
          href={result.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-medium text-white"
        >
          <WhatsAppIcon /> {t('done.whatsapp')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="partnerA">{t('partnerA')}</label>
          <input id="partnerA" name="partnerA" required maxLength={80} className={field} autoComplete="given-name" />
        </div>
        <div>
          <label className={label} htmlFor="partnerB">{t('partnerB')}</label>
          <input id="partnerB" name="partnerB" required maxLength={80} className={field} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="email">{t('email')}</label>
        <input id="email" name="email" type="email" required className={field} autoComplete="email" inputMode="email" />
        <p className="mt-1 text-xs text-stone-500">{t('emailHelp')}</p>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className={label} htmlFor="phone">{t('phone')}</label>
          <input id="phone" name="phone" type="tel" required className={field} autoComplete="tel" inputMode="tel" placeholder="55 1234 5678" />
        </div>
        <div>
          <label className={label} htmlFor="country">{t('country')}</label>
          <select id="country" name="country" defaultValue="MX" className={field}>
            {(['MX', 'US', 'CA'] as const).map((c) => (
              <option key={c} value={c}>{t(`countries.${c}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="language">{t('language')}</label>
          <select id="language" name="language" defaultValue={locale === 'en' ? 'en' : 'es'} className={field}>
            {(['es', 'en', 'both'] as const).map((l) => (
              <option key={l} value={l}>{t(`languages.${l}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="eventDate">{t('eventDate')}</label>
          <input id="eventDate" name="eventDate" type="date" className={field} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className={label} htmlFor="city">{t('city')}</label>
          <input id="city" name="city" maxLength={120} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="guestsEstimate">{t('guests')}</label>
          <input id="guestsEstimate" name="guestsEstimate" type="number" min={1} max={5000} inputMode="numeric" className={`${field} w-28`} />
        </div>
      </div>

      {packages.length ? (
        <div>
          <p className={label}>{t('package')}</p>
          <div className="grid grid-cols-2 gap-2">
            {packages.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => setPackageCode(p.code)}
                aria-pressed={packageCode === p.code}
                className={`rounded-sm border px-3 py-2.5 text-left text-sm transition-colors ${
                  packageCode === p.code ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'
                }`}
              >
                <span className="block font-medium">{p.name}</span>
                <span className={`block text-xs ${packageCode === p.code ? 'text-stone-300' : 'text-stone-500'}`}>{p.priceLabel}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPackageCode('')}
              aria-pressed={packageCode === ''}
              className={`rounded-sm border px-3 py-2.5 text-left text-sm ${
                packageCode === '' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-500'
              }`}
            >
              {t('packageNone')}
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor="message">{t('message')}</label>
        <textarea id="message" name="message" maxLength={2000} className={`${field} min-h-24 resize-y`} placeholder={t('messagePlaceholder')} />
      </div>

      <label className="flex items-start gap-3 text-xs leading-relaxed text-stone-600">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900" />
        <span>
          {t.rich('consent', {
            link: (chunks) => (
              <a href={`/legal/privacidad?lang=${locale}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {chunks}
              </a>
            ),
          })}
        </span>
      </label>

      {result && !result.ok ? (
        <p className="rounded-sm bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800" role="alert">
          {t(`errors.${result.error}`)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-5 py-3.5 text-xs uppercase tracking-[0.25em] text-white disabled:opacity-60"
      >
        {pending ? t('sending') : t('submit')}
      </button>
    </form>
  );
}

function firstNameOf(r: Extract<LeadResult, { ok: true }>): string {
  // El saludo lleva el nombre que la persona escribió; viene dentro del texto de WhatsApp.
  const m = decodeURIComponent(r.whatsappUrl).match(/(?:Soy|I'm) ([^,]+),/);
  return m?.[1] ?? '';
}

export function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 15.1 3.7 13.6 3.7 12c0-4.6 3.7-8.3 8.3-8.3s8.3 3.7 8.3 8.3-3.7 8.2-8.3 8.2z" />
    </svg>
  );
}
