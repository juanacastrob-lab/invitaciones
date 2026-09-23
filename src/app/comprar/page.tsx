import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { REGION_COOKIE, regionFromRequest } from '@/lib/region';
import { EVENT_TYPES_BY_REGION } from '@/lib/event-types';
import { FONT_VARIABLE_CLASSES } from '@/lib/fonts-loader';
import { stripeConfig } from '@/lib/stripe';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { APP_NAME, BANK_DETAILS, DEFAULT_LOCALE, isLocale } from '@/lib/config';
import { getActivePackages } from '@/lib/packages';
import { getActiveExtras, getPlannerByCode } from '@/lib/store';
import { Checkout } from '@/components/store/Checkout';
import { isEventType } from '@/lib/event-types';
import { loadDraft } from '@/actions/draft';

export const metadata: Metadata = { title: `Arma tu invitación · ${APP_NAME}` };
export const dynamic = 'force-dynamic';

/** La tienda: paquete → extras → quién la arma → datos → pago. */
export default async function BuyPage({ searchParams }: { searchParams: Promise<{ lang?: string; paquete?: string; ref?: string; tipo?: string; d?: string }> }) {
  const { lang, paquete, ref, tipo, d } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [h, c] = await Promise.all([headers(), cookies()]);
  const region = regionFromRequest({ cookie: c.get(REGION_COOKIE)?.value, headers: h });
  const country = region === 'US' ? 'US' : 'MX';
  const [planner, draft] = await Promise.all([getPlannerByCode(ref), d ? loadDraft(d) : Promise.resolve(null)]);
  const [t, tl, messages, packages, extras] = await Promise.all([
    getTranslations({ locale, namespace: 'store' }),
    getTranslations({ locale, namespace: 'landing' }),
    getMessages({ locale }),
    getActivePackages(country),
    getActiveExtras(country),
  ]);

  const featureLabels: Record<string, string> = {};
  for (const p of packages) for (const f of p.features) if (tl.has(`packages.features.${f}`)) featureLabels[f] = tl(`packages.features.${f}`);

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-stone-900">
      <header className="border-b border-stone-200/70 px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href={locale === 'es' ? '/' : '/en'}><img src="/brand/wordmark.png" alt={APP_NAME} className="h-5 w-auto mix-blend-multiply" /></a>
          <div className="flex items-center gap-4 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">
            {/* Región: discreto, arriba. Cambia fiestas, precios y moneda. */}
            <a href={`/api/region?to=${region === 'MX' ? 'US' : 'MX'}&next=${encodeURIComponent(`/comprar${locale === 'en' ? '?lang=en' : ''}`)}`} className="rounded-full border border-stone-200 px-3 py-1 hover:border-stone-400" title={t('region.switch')}>
              {region === 'MX' ? t('region.mx') : t('region.us')}
            </a>
            <a href={`/comprar?lang=${locale === 'es' ? 'en' : 'es'}${paquete ? `&paquete=${paquete}` : ''}${ref ? `&ref=${ref}` : ''}`}>{locale === 'es' ? 'EN' : 'ES'}</a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="mb-8 font-serif text-4xl">{t('title')}</h1>
        <NextIntlClientProvider locale={locale} messages={{ store: messages.store }}>
          <Checkout locale={locale} packages={packages} extras={extras} featureLabels={featureLabels} preselected={paquete} bank={BANK_DETAILS} initialType={isEventType(tipo) ? tipo : undefined} planner={planner ? { code: ref!.toUpperCase(), name: planner.name, email: planner.email } : null} initialDraft={draft && !draft.paid ? draft : null} region={region} eventTypes={EVENT_TYPES_BY_REGION[region]} fontClasses={FONT_VARIABLE_CLASSES} stripeEnabled={Boolean(stripeConfig())} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
