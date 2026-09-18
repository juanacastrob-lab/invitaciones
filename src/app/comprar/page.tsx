import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { APP_NAME, BANK_DETAILS, DEFAULT_LOCALE, isLocale } from '@/lib/config';
import { getActivePackages } from '@/lib/packages';
import { getActiveExtras } from '@/lib/store';
import { Checkout } from '@/components/store/Checkout';

export const metadata: Metadata = { title: `Arma tu invitación · ${APP_NAME}` };
export const dynamic = 'force-dynamic';

/** La tienda: paquete → extras → quién la arma → datos → pago. */
export default async function BuyPage({ searchParams }: { searchParams: Promise<{ lang?: string; paquete?: string }> }) {
  const { lang, paquete } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, tl, messages, packages, extras] = await Promise.all([
    getTranslations({ locale, namespace: 'store' }),
    getTranslations({ locale, namespace: 'landing' }),
    getMessages({ locale }),
    getActivePackages('MX'),
    getActiveExtras('MX'),
  ]);

  const featureLabels: Record<string, string> = {};
  for (const p of packages) for (const f of p.features) if (tl.has(`packages.features.${f}`)) featureLabels[f] = tl(`packages.features.${f}`);

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-stone-900">
      <header className="border-b border-stone-200/70 px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href={locale === 'es' ? '/' : '/en'}><img src="/brand/wordmark.png" alt={APP_NAME} className="h-5 w-auto mix-blend-multiply" /></a>
          <a href={`/comprar?lang=${locale === 'es' ? 'en' : 'es'}${paquete ? `&paquete=${paquete}` : ''}`} className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{locale === 'es' ? 'EN' : 'ES'}</a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="mb-8 font-serif text-4xl">{t('title')}</h1>
        <NextIntlClientProvider locale={locale} messages={{ store: messages.store }}>
          <Checkout locale={locale} packages={packages} extras={extras} featureLabels={featureLabels} preselected={paquete} bank={BANK_DETAILS} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
