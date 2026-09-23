import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { APP_NAME, DEFAULT_LOCALE, WHATSAPP_NUMBER, whatsappLink, type Locale } from '@/lib/config';
import { DEMO_SLUG } from '@/demo/demo-event';
import { getActivePackages, formatPrice } from '@/lib/packages';
import { LeadForm, WhatsAppIcon } from '@/components/landing/LeadForm';
import { EVENT_TYPES_BY_REGION, EVENT_TYPE_LABEL } from '@/lib/event-types';
import { TEMPLATE_IDS, TEMPLATES } from '@/templates/registry';
import { getApprovedReviews } from '@/lib/reviews';
import { Reviews } from '@/components/landing/Reviews';

/**
 * La portada de holaboda. Estática con revalidación: no gasta funciones de
 * Netlify por visita. Los paquetes vienen de la base (cacheados una hora).
 */
export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const tLead = await getTranslations({ locale, namespace: 'lead' });
  const messages = await getMessages({ locale });
  const [packages, reviews] = await Promise.all([getActivePackages('MX'), getApprovedReviews()]);
  const other: Locale = locale === 'es' ? 'en' : 'es';
  const demoHref = `/i/${DEMO_SLUG}${locale === DEFAULT_LOCALE ? '' : `?lang=${locale}`}`;
  const featureKeys = (codes: string[]) => codes.filter((c) => t.has(`packages.features.${c}`));

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-stone-900">
      {/* ------------------------------------------------- portada + nav */}
      <section className="relative isolate flex min-h-[100svh] flex-col text-white">
        <picture className="absolute inset-0 -z-10">
          <source media="(min-width: 768px)" srcSet="/brand/hero-desktop.webp" />
          <img
            src="/brand/hero-mobile.webp"
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover object-[62%_center] md:object-[center_40%]"
          />
        </picture>
        {/* degradado para que el logo y el texto se lean sobre la foto */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/10 to-black/60 md:from-black/35 md:via-black/10 md:to-black/45" />

        <header className="relative">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <a href={locale === 'es' ? '/' : '/en'} className="text-[0.7rem] uppercase tracking-[0.3em] text-white/90">
              {APP_NAME}
            </a>
            <nav className="flex items-center gap-4 text-[0.7rem] uppercase tracking-[0.2em] text-white/85">
              <a href="#paquetes" className="hidden sm:inline">{t('nav.packages')}</a>
              <a href={demoHref} className="hidden sm:inline">{t('nav.demo')}</a>
              <a href={locale === 'es' ? '/en' : '/'}>{other.toUpperCase()}</a>
              <a href="/login" className="rounded-full border border-white/60 px-3 py-1.5">{t('nav.login')}</a>
            </nav>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 pb-10 pt-4 text-center md:items-start md:justify-center md:pb-24 md:pt-6 md:text-left">
          <img
            src="/brand/logo-white.png"
            alt={APP_NAME}
            width={968}
            height={551}
            className="w-52 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:w-72 md:w-80"
          />
          <h1 className="mt-5 max-w-xl font-serif text-[1.9rem] leading-tight md:mt-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-5xl md:text-[3.4rem]">
            {t('hero.title')}
          </h1>
          <p className="mt-3 max-w-md text-[0.9rem] leading-relaxed md:mt-4 text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] sm:text-base">
            {t('hero.body')}
          </p>
          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8 sm:w-auto sm:flex-row md:mt-8 md:pt-0">
            <a href={locale === 'es' ? '/comprar' : '/comprar?lang=en'} className="w-full rounded-full bg-white px-7 py-3.5 text-xs uppercase tracking-[0.25em] text-stone-900 sm:w-auto">
              {t('hero.cta')}
            </a>
            <a href={demoHref} className="w-full rounded-full border border-white/80 px-7 py-3.5 text-xs uppercase tracking-[0.25em] text-white backdrop-blur-sm sm:w-auto">
              {t('hero.demo')}
            </a>
          </div>
        </div>
      </section>

      <main>
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

        {/* ---------------------------------------------------- tipos de evento */}
        <section className="px-5 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{t('types.title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-stone-600">{t('types.body')}</p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {EVENT_TYPES_BY_REGION[locale === 'en' ? 'US' : 'MX'].filter((k) => k !== 'otro').map((k) => (
                <li key={k}>
                  <a href={`/comprar?tipo=${k}${locale === 'es' ? '' : '&lang=en'}`} className="inline-block rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-[0.15em] text-stone-700 hover:border-stone-900">
                    {EVENT_TYPE_LABEL[k][locale]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------ plantillas */}
        <section className="bg-white px-5 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{t('templates.title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[0.95rem] leading-relaxed text-stone-600">{t('templates.body')}</p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TEMPLATE_IDS.map((id) => {
                const th = TEMPLATES[id];
                return (
                  <li key={id}>
                    <a href={`/i/${DEMO_SLUG}?template=${id}${locale === 'es' ? '' : '&lang=en'}`} className="block overflow-hidden rounded-2xl border border-stone-200 shadow-sm transition-transform hover:-translate-y-0.5">
                      <div className="flex aspect-[3/4] flex-col items-center justify-center px-3 text-center" style={{ background: th.colors.paper, color: th.colors.ink }}>
                        <span className="text-[0.55rem] uppercase tracking-[0.3em]" style={{ color: th.colors.muted }}>{locale === 'es' ? 'Nos casamos' : 'We are getting married'}</span>
                        <span className={`mt-2 text-lg leading-tight ${th.heading === 'sans' ? 'font-sans font-light' : 'font-serif'}`}>Ana<br /><span style={{ color: th.colors.accent }}>&</span><br />Luis</span>
                        <span className="mt-3 h-px w-8" style={{ background: th.colors.line }} />
                        <span className="mt-2 text-[0.55rem] uppercase tracking-[0.2em]" style={{ color: th.colors.muted }}>13 · 03 · 2027</span>
                      </div>
                      <div className="border-t border-stone-100 bg-white px-3 py-2">
                        <p className="text-sm font-medium text-stone-900">{th.name[locale]}</p>
                        <p className="text-[0.7rem] leading-snug text-stone-500">{th.description[locale]}</p>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-center text-xs text-stone-500">{t('templates.open')}</p>
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
                {packages.map((p) => (
                  <div key={p.code} className={`flex flex-col rounded-sm border p-5 ${p.code === 'con_pases' ? 'border-stone-900' : 'border-stone-200'}`}>
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

        <Reviews reviews={reviews} locale={locale} title={t('reviews.title')} subtitle={t('reviews.subtitle')} />

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
