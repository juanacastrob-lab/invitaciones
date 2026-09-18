import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { APP_NAME, DEFAULT_LOCALE, WHATSAPP_NUMBER, whatsappLink, type Locale } from '@/lib/config';
import { DEMO_SLUG } from '@/demo/demo-event';
import { getActivePackages, formatPrice } from '@/lib/packages';
import { LeadForm, WhatsAppIcon } from '@/components/landing/LeadForm';

/**
 * La portada de holaboda. Estática con revalidación: no gasta funciones de
 * Netlify por visita. Los paquetes vienen de la base (cacheados una hora).
 */
export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const tLead = await getTranslations({ locale, namespace: 'lead' });
  const messages = await getMessages({ locale });
  const packages = await getActivePackages('MX');
  const other: Locale = locale === 'es' ? 'en' : 'es';
  const demoHref = `/i/${DEMO_SLUG}${locale === DEFAULT_LOCALE ? '' : `?lang=${locale}`}`;
  const featureKeys = (codes: string[]) => codes.filter((c) => t.has(`packages.features.${c}`));

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-stone-900">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#faf8f5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href={locale === 'es' ? '/' : '/en'} className="flex items-center gap-2">
            <img src="/brand/wordmark.png" alt={APP_NAME} className="h-5 w-auto mix-blend-multiply" />
          </a>
          <nav className="flex items-center gap-4 text-[0.7rem] uppercase tracking-[0.2em] text-stone-500">
            <a href="#paquetes" className="hidden sm:inline">{t('nav.packages')}</a>
            <a href={demoHref}>{t('nav.demo')}</a>
            <a href={locale === 'es' ? '/en' : '/'}>{other.toUpperCase()}</a>
            <a href="/login" className="rounded-full border border-stone-300 px-3 py-1.5">{t('nav.login')}</a>
          </nav>
        </div>
      </header>

      <main>
        {/* ----------------------------------------------------------- hero */}
        <section className="px-5 pb-14 pt-12 text-center">
          <div className="mx-auto max-w-2xl">
            <img src="/brand/logo.png" alt={APP_NAME} className="mx-auto w-56 mix-blend-multiply" />
            <h1 className="mt-6 font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">{t('hero.title')}</h1>
            <p className="mx-auto mt-5 max-w-xl text-[0.95rem] leading-relaxed text-stone-600">{t('hero.body')}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#formulario" className="w-full rounded-full bg-stone-900 px-6 py-3.5 text-xs uppercase tracking-[0.25em] text-white sm:w-auto">
                {t('hero.cta')}
              </a>
              <a href={demoHref} className="w-full rounded-full border border-stone-300 px-6 py-3.5 text-xs uppercase tracking-[0.25em] text-stone-700 sm:w-auto">
                {t('hero.demo')}
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- preview */}
        <section className="bg-white px-5 py-14">
          <div className="mx-auto grid max-w-4xl items-center gap-10 sm:grid-cols-2">
            <div className="text-center sm:text-left">
              <h2 className="text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{t('preview.title')}</h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-stone-600">{t('preview.body')}</p>
              <a href={demoHref} className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-stone-900 underline underline-offset-4">
                {t('preview.open')}
              </a>
            </div>
            <div className="flex justify-center gap-4">
              <img src="/brand/demo-portada.jpg" alt={t('preview.coverAlt')} loading="lazy" className="w-40 rounded-2xl border border-stone-200 shadow-lg sm:w-44" />
              <img src="/brand/demo-rsvp.jpg" alt={t('preview.rsvpAlt')} loading="lazy" className="mt-8 w-40 rounded-2xl border border-stone-200 shadow-lg sm:w-44" />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- pasos */}
        <section className="px-5 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{t('how.title')}</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="text-center">
                  <span className="font-serif text-3xl text-[#7d8471]">{i + 1}</span>
                  <p className="mt-2 font-medium text-stone-900">{t(`how.steps.${i}.t`)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{t(`how.steps.${i}.d`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- paquetes */}
        {packages.length ? (
          <section id="paquetes" className="bg-white px-5 py-14">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{t('packages.title')}</h2>
              <p className="mt-2 text-center text-xs text-stone-500">{t('packages.subtitle', { currency: packages[0].currency })}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((p, i) => (
                  <div key={p.code} className={`flex flex-col rounded-sm border p-5 ${i === 2 ? 'border-stone-900' : 'border-stone-200'}`}>
                    <p className="font-serif text-2xl text-stone-900">{p.name}</p>
                    <p className="mt-1 text-lg text-stone-700">{formatPrice(p.price, p.currency, locale)}</p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm text-stone-600">
                      {featureKeys(p.features).map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className="text-[#7d8471]" aria-hidden>·</span>
                          {t(`packages.features.${f}`)}
                        </li>
                      ))}
                    </ul>
                    <a href={`/comprar?paquete=${p.code}${locale === 'es' ? '' : '&lang=en'}`} className="mt-5 rounded-full border border-stone-300 px-4 py-2 text-center text-xs uppercase tracking-[0.2em] text-stone-700 hover:border-stone-900">
                      {t('packages.choose')}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------- formulario */}
        <section id="formulario" className="px-5 py-14">
          <div className="mx-auto max-w-md">
            <h2 className="text-center font-serif text-3xl text-stone-900">{tLead('title')}</h2>
            <p className="mt-2 text-center text-sm text-stone-500">{tLead('subtitle')}</p>
            <div className="mt-8">
              <NextIntlClientProvider locale={locale} messages={{ lead: messages.lead }}>
                <LeadForm
                  locale={locale}
                  packages={packages.map((p) => ({ code: p.code, name: p.name, priceLabel: formatPrice(p.price, p.currency, locale) }))}
                />
              </NextIntlClientProvider>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 px-5 py-10 text-center text-xs text-stone-500">
        <img src="/brand/wordmark.png" alt={APP_NAME} className="mx-auto h-4 w-auto opacity-70 mix-blend-multiply" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <a href={`/legal/privacidad?lang=${locale}`} className="underline underline-offset-4">{t('footer.privacy')}</a>
          <a href={whatsappLink(locale === 'es' ? 'Hola, quiero información sobre las invitaciones.' : 'Hi, I would like information about the invitations.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-4">
            <WhatsAppIcon /> {t('footer.whatsapp')}
          </a>
        </div>
        <p className="mt-4 text-stone-400">{WHATSAPP_NUMBER}</p>
      </footer>
    </div>
  );
}
