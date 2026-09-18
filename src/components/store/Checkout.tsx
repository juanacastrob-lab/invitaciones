'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createOrder } from '@/actions/order';
import type { OrderResult } from '@/schemas/order';
import type { Locale } from '@/lib/config';
import { WhatsAppIcon } from '@/components/landing/LeadForm';
import { EVENT_TYPES, EVENT_TYPE_LABEL, needsTwoNames, type EventType } from '@/lib/event-types';

export interface StorePackage { code: string; name: string; price: number; currency: string; features: string[] }
export interface StoreExtra { code: string; name: string; description: string | null; price: number; included_in: string[] }

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none';
const label = 'mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-stone-500';
const STEPS = ['package', 'extras', 'mode', 'contact', 'payment'] as const;

export function Checkout({ locale, packages, extras, featureLabels, preselected, bank, planner }: {
  locale: Locale;
  packages: StorePackage[];
  extras: StoreExtra[];
  featureLabels: Record<string, string>;
  preselected?: string;
  bank: { bank: string; holder: string; clabe: string };
  /** Viene de /comprar?ref=CODIGO: el pedido se atribuye a este planner. */
  planner?: { code: string; name: string; email: string } | null;
}) {
  const t = useTranslations('store');
  const fmt = (n: number, cur: string) => new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

  const [step, setStep] = useState<number>(preselected && packages.some((p) => p.code === preselected) ? 1 : 0);
  const [eventType, setEventType] = useState<EventType>('boda');
  const [pkgCode, setPkgCode] = useState(preselected ?? packages[Math.min(2, packages.length - 1)]?.code ?? '');
  const [extraCodes, setExtraCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<'team' | 'self' | 'planner'>(planner ? 'planner' : 'team');
  const [plannerEmail, setPlannerEmail] = useState(planner?.email ?? '');
  const [contact, setContact] = useState({ partnerA: '', partnerB: '', email: '', phone: '', country: 'MX', eventDate: '' });
  const [method, setMethod] = useState<'card_sim' | 'transfer'>('card_sim');
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<OrderResult | null>(null);

  const pkg = packages.find((p) => p.code === pkgCode);
  const offered = useMemo(() => extras.filter((e) => !e.included_in.includes(pkgCode)), [extras, pkgCode]);
  const chosenExtras = offered.filter((e) => extraCodes.includes(e.code));
  const total = (pkg?.price ?? 0) + chosenExtras.reduce((s, e) => s + e.price, 0);
  const currency = pkg?.currency ?? 'MXN';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createOrder({
        eventType, plannerCode: planner?.code ?? '', packageCode: pkgCode, extraCodes, buildMode: mode, plannerEmail,
        ...contact, paymentMethod: method, card: method === 'card_sim' ? card : undefined, locale, consent,
      });
      setResult(r);
      if (r.ok) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ------------------------------------------------------------ confirmación
  if (result?.ok) {
    const paid = result.status === 'pagado';
    return (
      <div className="rounded-sm border border-stone-200 bg-white p-6 text-center" role="status">
        <p className="font-serif text-3xl">{t(paid ? 'done.paid' : 'done.pending', { number: result.number })}</p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{t(paid ? 'done.paidBody' : 'done.pendingBody')}</p>
        {!paid ? (
          <dl className="mx-auto mt-5 max-w-xs space-y-1 rounded-sm bg-stone-50 p-4 text-left text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">{t('done.bank')}</dt><dd>{bank.bank}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t('done.holder')}</dt><dd className="text-right">{bank.holder}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t('done.clabe')}</dt><dd className="tabular-nums">{bank.clabe}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t('done.concept')}</dt><dd>HB-{result.number}</dd></div>
            <div className="flex justify-between border-t border-stone-200 pt-2 font-medium"><dt>{t('payment.total')}</dt><dd>{fmt(result.total, result.currency)}</dd></div>
          </dl>
        ) : null}
        <p className="mt-4 text-xs text-stone-500">{t('done.email')}</p>
        <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-medium text-white">
          <WhatsAppIcon /> {t('done.whatsapp')}
        </a>
      </div>
    );
  }

  const canNext = [Boolean(pkg), true, mode !== 'planner' || plannerEmail.includes('@'), contact.partnerA && contact.email.includes('@') && contact.phone.length >= 6, true][step];

  return (
    <div>
      {/* pasos */}
      <ol className="mb-8 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.2em]">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${i === step ? 'text-stone-900' : i < step ? 'text-stone-500' : 'text-stone-300'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[0.6rem] ${i === step ? 'border-stone-900 bg-stone-900 text-white' : i < step ? 'border-stone-400' : 'border-stone-200'}`}>{i + 1}</span>
            {t(`steps.${s}`)}{i < STEPS.length - 1 ? <span className="mx-1 text-stone-300">—</span> : null}
          </li>
        ))}
      </ol>

      {planner ? <p className="mb-6 rounded-sm bg-[#eef0ea] px-4 py-3 text-sm text-[#4f5a48]">{t('plannerBanner', { name: planner.name })}</p> : null}

      <form onSubmit={submit} noValidate>
        {/* 1. paquete */}
        {step === 0 ? (
          <section>
            <h2 className="mb-3 font-serif text-2xl">{t('eventType.title')}</h2>
            <div className="mb-8 flex flex-wrap gap-2">
              {EVENT_TYPES.map((k) => (
                <button key={k} type="button" onClick={() => setEventType(k)} aria-pressed={eventType === k}
                  className={`rounded-full border px-3 py-1.5 text-xs ${eventType === k ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'}`}>
                  {EVENT_TYPE_LABEL[k][locale]}
                </button>
              ))}
            </div>
            <h2 className="mb-4 font-serif text-2xl">{t('package.title')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((p, i) => (
                <button key={p.code} type="button" onClick={() => setPkgCode(p.code)} aria-pressed={pkgCode === p.code}
                  className={`rounded-sm border p-4 text-left ${pkgCode === p.code ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-xl">{p.name}</span>
                    <span className="text-sm">{fmt(p.price, p.currency)}</span>
                  </div>
                  {i === 2 ? <span className="mt-1 inline-block rounded-full bg-[#eef0ea] px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-[#7d8471]">{t('package.popular')}</span> : null}
                  <ul className="mt-3 space-y-1 text-xs text-stone-600">
                    {p.features.filter((f) => featureLabels[f]).map((f) => <li key={f}>· {featureLabels[f]}</li>)}
                  </ul>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* 2. extras */}
        {step === 1 ? (
          <section>
            <h2 className="mb-1 font-serif text-2xl">{t('extras.title')}</h2>
            <p className="mb-4 text-sm text-stone-500">{t('extras.subtitle')}</p>
            {!offered.length ? <p className="text-sm text-stone-500">{t('extras.none')}</p> : (
              <ul className="space-y-2">
                {offered.map((e) => (
                  <li key={e.code}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${extraCodes.includes(e.code) ? 'border-stone-900' : 'border-stone-200'}`}>
                      <input type="checkbox" className="mt-1 accent-stone-900" checked={extraCodes.includes(e.code)}
                        onChange={(ev) => setExtraCodes((c) => ev.target.checked ? [...c, e.code] : c.filter((x) => x !== e.code))} />
                      <span className="flex-1">
                        <span className="flex justify-between text-sm"><span className="font-medium">{e.name}</span><span>+{fmt(e.price, currency)}</span></span>
                        {e.description ? <span className="mt-0.5 block text-xs text-stone-500">{e.description}</span> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 3. quién la arma */}
        {step === 2 ? (
          <section>
            <h2 className="mb-4 font-serif text-2xl">{t('mode.title')}</h2>
            <div className="space-y-2">
              {(['team', 'self', 'planner'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                  className={`block w-full rounded-sm border p-4 text-left ${mode === m ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
                  <span className="block font-medium">{t(`mode.${m}.t`)}</span>
                  <span className="mt-1 block text-sm text-stone-600">{t(`mode.${m}.d`)}</span>
                </button>
              ))}
            </div>
            {mode === 'planner' ? (
              <div className="mt-4">
                <label className={label} htmlFor="plannerEmail">{t('mode.plannerEmail')}</label>
                <input id="plannerEmail" type="email" className={field} value={plannerEmail} onChange={(e) => setPlannerEmail(e.target.value)} readOnly={Boolean(planner)} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 4. datos */}
        {step === 3 ? (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl">{t('contact.title')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>{t(needsTwoNames(eventType) ? 'contact.partnerA' : 'contact.name')}</label><input className={field} required value={contact.partnerA} onChange={(e) => setContact({ ...contact, partnerA: e.target.value })} /></div>
              <div><label className={label}>{t(needsTwoNames(eventType) ? 'contact.partnerB' : 'contact.secondName')}</label><input className={field} value={contact.partnerB} onChange={(e) => setContact({ ...contact, partnerB: e.target.value })} /></div>
            </div>
            <div><label className={label}>{t('contact.email')}</label><input type="email" className={field} required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /><p className="mt-1 text-xs text-stone-500">{t('contact.emailHelp')}</p></div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div><label className={label}>{t('contact.phone')}</label><input type="tel" className={field} required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="55 1234 5678" /></div>
              <div><label className={label}>{t('contact.country')}</label>
                <select className={field} value={contact.country} onChange={(e) => setContact({ ...contact, country: e.target.value })}><option value="MX">México</option><option value="US">USA</option><option value="CA">Canadá</option></select></div>
            </div>
            <div><label className={label}>{t('contact.eventDate')}</label><input type="date" className={field} value={contact.eventDate} onChange={(e) => setContact({ ...contact, eventDate: e.target.value })} /></div>
          </section>
        ) : null}

        {/* 5. pago */}
        {step === 4 ? (
          <section className="space-y-5">
            <h2 className="font-serif text-2xl">{t('payment.title')}</h2>
            <dl className="rounded-sm bg-stone-50 p-4 text-sm">
              <div className="flex justify-between"><dt>{t('payment.package')} · {pkg?.name}</dt><dd>{fmt(pkg?.price ?? 0, currency)}</dd></div>
              {chosenExtras.map((e) => <div key={e.code} className="flex justify-between text-stone-600"><dt>{e.name}</dt><dd>{fmt(e.price, currency)}</dd></div>)}
              <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-medium"><dt>{t('payment.total')}</dt><dd>{fmt(total, currency)}</dd></div>
            </dl>

            <div className="grid grid-cols-2 gap-2">
              {(['card_sim', 'transfer'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                  className={`rounded-sm border px-3 py-3 text-sm ${method === m ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'}`}>
                  {t(m === 'card_sim' ? 'payment.card' : 'payment.transfer')}
                </button>
              ))}
            </div>

            {method === 'card_sim' ? (
              <div className="space-y-3 rounded-sm border border-stone-200 p-4">
                <p className="text-xs text-amber-800">{t('payment.cardHelp')}</p>
                <div><label className={label}>{t('payment.cardNumber')}</label><input inputMode="numeric" className={field} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, '') })} placeholder="4242 4242 4242 4242" /></div>
                <div><label className={label}>{t('payment.cardName')}</label><input className={field} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>{t('payment.cardExp')}</label><input className={field} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="12/28" /></div>
                  <div><label className={label}>{t('payment.cardCvc')}</label><input inputMode="numeric" className={field} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })} placeholder="123" /></div>
                </div>
              </div>
            ) : <p className="text-sm text-stone-600">{t('payment.transferHelp')}</p>}

            <label className="flex items-start gap-3 text-xs leading-relaxed text-stone-600">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-stone-900" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.rich('payment.consent', { link: (c) => <a href={`/legal/privacidad?lang=${locale}`} target="_blank" className="underline">{c}</a> })}</span>
            </label>

            {result && !result.ok ? <p role="alert" className="rounded-sm bg-red-50 px-3 py-2 text-xs text-red-800">{t(`errors.${result.error}`)}</p> : null}
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">{t('back')}</button> : <span />}
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{t('payment.total')}: <strong className="text-stone-900">{fmt(total, currency)}</strong></span>
            {step < STEPS.length - 1 ? (
              <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-full bg-stone-900 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white disabled:opacity-40">{t('next')}</button>
            ) : (
              <button type="submit" disabled={pending} className="rounded-full bg-stone-900 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white disabled:opacity-60">
                {pending ? t('payment.sending') : method === 'card_sim' ? t('payment.pay', { total: fmt(total, currency) }) : t('payment.reserve')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
