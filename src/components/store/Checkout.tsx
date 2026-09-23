'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createOrder } from '@/actions/order';
import { createDraft, saveDraft, type DraftRow } from '@/actions/draft';
import { draftData, isExpress, templateForType, type DraftData, EMPTY_DRAFT } from '@/lib/drafts';
import { presetFor } from '@/lib/admin/template';
import type { OrderResult } from '@/schemas/order';
import type { Locale } from '@/lib/config';
import { WhatsAppIcon } from '@/components/landing/LeadForm';
import { EVENT_TYPES_BY_REGION, EVENT_TYPE_LABEL, needsTwoNames, type EventType, type Region } from '@/lib/event-types';
import { DesignStep } from './DesignStep';
import { DetailsStep } from './DetailsStep';
import { PreviewStep } from './PreviewStep';
import { EventTypeIcon } from './EventTypeIcon';

export interface StorePackage { code: string; name: string; price: number; currency: string; features: string[] }
export interface StoreExtra { code: string; name: string; description: string | null; price: number; included_in: string[] }

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none';
const label = 'mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-stone-500';

type Step = 'type' | 'basics' | 'preview' | 'package' | 'extras' | 'mode' | 'payment';
/**
 * Primero ven su invitación, luego eligen paquete: tipo → lo básico → vista
 * previa → paquete → (extras → quién la arma, solo web) → pago.
 */
const stepsFor = (code: string): Step[] => (isExpress(code) ? ['type', 'basics', 'preview', 'package', 'payment'] : ['type', 'basics', 'preview', 'package', 'extras', 'mode', 'payment']);
/** El paquete que se marca como "el más pedido" y queda elegido de entrada. */
const POPULAR = 'completo';

export function Checkout({ locale, packages, extras, featureLabels, preselected, bank, planner, initialType, initialDraft, region = 'MX', eventTypes = EVENT_TYPES_BY_REGION.MX, fontClasses = '' }: {
  locale: Locale;
  packages: StorePackage[];
  extras: StoreExtra[];
  featureLabels: Record<string, string>;
  preselected?: string;
  bank: { bank: string; holder: string; clabe: string };
  /** Viene de /comprar?ref=CODIGO: el pedido se atribuye a este planner. */
  planner?: { code: string; name: string; email: string } | null;
  initialType?: EventType;
  /** Viene de /comprar?d=CLAVE: el cliente regresa a su borrador. */
  initialDraft?: DraftRow | null;
  /** México o EE. UU./Canadá: cambia fiestas, países y moneda. */
  region?: Region;
  eventTypes?: EventType[];
  fontClasses?: string;
}) {
  const t = useTranslations('store');
  const fmt = (n: number, cur: string) => new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

  const [eventType, setEventTypeRaw] = useState<EventType>(initialDraft?.event_type ?? initialType ?? 'boda');
  const [pkgCode, setPkgCode] = useState(
    initialDraft?.package_code && packages.some((p) => p.code === initialDraft.package_code) ? initialDraft.package_code
      : preselected && packages.some((p) => p.code === preselected) ? preselected
        : packages.some((p) => p.code === POPULAR) ? POPULAR : packages[0]?.code ?? '',
  );
  const [step, setStep] = useState<number>(initialDraft ? Math.max(1, Math.min(initialDraft.step, 2)) : initialType ? 1 : 0);
  const [draftKey, setDraftKey] = useState<string | null>(initialDraft?.key ?? null);
  const [draft, setDraft] = useState<DraftData>(() => initialDraft?.data ?? withPreset({ ...EMPTY_DRAFT, eventType: initialType ?? 'boda', template: templateForType(initialType ?? 'boda') }, initialType ?? 'boda', locale));
  const [previewVersion, setPreviewVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'design' | 'details' | null>(null);
  const setD = (patch: Partial<DraftData>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const [extraCodes, setExtraCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<'team' | 'self' | 'planner'>(planner ? 'planner' : 'self');
  const [plannerEmail, setPlannerEmail] = useState(planner?.email ?? '');
  const [contact, setContact] = useState({ email: initialDraft?.data.email ?? '', phone: initialDraft?.data.phone ?? '', country: initialDraft?.country ?? (region === 'US' ? 'US' : 'MX') });
  const [method, setMethod] = useState<'card_sim' | 'apple_pay' | 'transfer'>('card_sim');
  const instant = method !== 'transfer';
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<OrderResult | null>(null);

  const STEPS = stepsFor(pkgCode);
  const express = isExpress(pkgCode);
  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const pkg = packages.find((p) => p.code === pkgCode);
  const offered = useMemo(() => extras.filter((e) => !e.included_in.includes(pkgCode)), [extras, pkgCode]);
  const chosenExtras = offered.filter((e) => extraCodes.includes(e.code));
  const total = (pkg?.price ?? 0) + chosenExtras.reduce((s, e) => s + e.price, 0);
  const currency = pkg?.currency ?? 'MXN';

  /** Elegir el tipo también elige diseño, encabezado y actos, y avanza solo. */
  const chooseType = (type: EventType) => {
    setEventTypeRaw(type);
    setDraft((d) => withPreset({ ...d, eventType: type, template: templateForType(type), colors: {} }, type, locale));
    setDirty(true);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Guarda el borrador (lo crea la primera vez) y, si se pide, refresca la vista previa. */
  const persist = async (nextStep: number, refresh: boolean): Promise<boolean> => {
    setDraftError(null);
    let key = draftKey;
    if (!key) {
      const r = await createDraft({ packageCode: pkgCode || 'pendiente', eventType, locale, country: contact.country });
      if (!r.ok || !r.data) { setDraftError(r.ok ? 'draft' : r.error); return false; }
      key = r.data.key; setDraftKey(key);
      try { const u = new URL(window.location.href); u.searchParams.set('d', key); window.history.replaceState(null, '', u.toString()); } catch { /* nada */ }
    }
    const r = await saveDraft(key, draftData.parse({ ...draft, eventType, email: contact.email, phone: contact.phone }), nextStep, pkgCode);
    if (!r.ok) { setDraftError(r.error); return false; }
    setDirty(false);
    if (refresh) setPreviewVersion((v) => v + 1);
    return true;
  };

  const goNext = () => start(async () => {
    const next = step + 1;
    if (!(await persist(next, STEPS[next] === 'preview' || STEPS[next] === 'package'))) return;
    setStep(next);
    setPanel(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Vista previa en vivo: colores, diseño y fuente van al iframe al instante;
  // lo demás (textos, fotos) se guarda solo al segundo de dejar de escribir y recarga.
  const previewFrame = () => document.querySelector<HTMLIFrameElement>('iframe[title]')?.contentWindow;
  useEffect(() => {
    previewFrame()?.postMessage({ type: 'hb:theme', template: draft.template, colors: draft.colors, font: draft.font }, '*');
  }, [draft.template, draft.colors, draft.font]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>('');
  useEffect(() => {
    if (current !== 'preview' || !draftKey || !dirty) return;
    const snapshot = JSON.stringify(draft);
    if (snapshot === lastSaved.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lastSaved.current = snapshot;
      const r = saveDraft(draftKey, draftData.parse({ ...draft, eventType, email: contact.email, phone: contact.phone }), step, pkgCode);
      void r.then((res) => { if (res.ok) { setDirty(false); setPreviewVersion((v) => v + 1); } else setDraftError(res.error); });
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, current, draftKey, dirty, eventType, contact.email, contact.phone, step, pkgCode]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (dirty && !(await persist(step, false))) return;
      const r = await createOrder({
        eventType, plannerCode: planner?.code ?? '', packageCode: pkgCode, extraCodes, buildMode: express ? 'self' : mode, plannerEmail,
        ...contact, partnerA: draft.partnerA, partnerB: draft.partnerB, eventDate: draft.date, draftKey: draftKey ?? '',
        paymentMethod: method, card: method === 'card_sim' ? card : undefined, locale, consent,
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
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{t(paid ? (express ? 'done.paidExpressBody' : 'done.paidBody') : express ? 'done.pendingBodyExpress' : 'done.pendingBody')}</p>
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

  const two = needsTwoNames(eventType);
  const contactOk = contact.email.includes('@') && contact.phone.length >= 6;
  const canNext: Record<Step, boolean> = {
    type: true,
    basics: Boolean(draft.partnerA && draft.date),
    preview: true,
    package: Boolean(pkg),
    extras: true,
    mode: mode !== 'planner' || plannerEmail.includes('@'),
    payment: contactOk,
  };

  return (
    <div>
      {/* progreso: una barra y el nombre del paso, sin la lista de siete pasos que asusta */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">
          <span className="text-stone-900">{t(`steps.${current}`)}</span>
          <span>{t('wizard.progress', { n: step + 1, total: STEPS.length })}</span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-stone-200"><div className="h-1 rounded-full bg-stone-900 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      {planner ? <p className="mb-6 rounded-sm bg-[#eef0ea] px-4 py-3 text-sm text-[#4f5a48]">{t('plannerBanner', { name: planner.name })}</p> : null}

      <form onSubmit={submit} noValidate>
        {/* 1. tipo de evento: un toque y avanza */}
        {current === 'type' ? (
          <section>
            <h2 className="mb-1 font-serif text-2xl">{t('wizard.type.title')}</h2>
            <p className="mb-4 text-sm text-stone-500">{t('wizard.type.body')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {eventTypes.map((k) => (
                <button key={k} type="button" onClick={() => chooseType(k)} className="group flex flex-col items-center gap-3 rounded-sm border border-stone-200 bg-white px-3 py-5 text-center text-stone-500 transition-colors hover:border-stone-900 hover:text-stone-900">
                  <EventTypeIcon type={k} className="h-9 w-9" />
                  <span className="font-serif text-lg leading-tight text-stone-900">{EVENT_TYPE_LABEL[k][locale]}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* 2. lo básico: nombres y fecha, nada más */}
        {current === 'basics' ? (
          <section className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-stone-500"><EventTypeIcon type={eventType} className="h-5 w-5" /> {EVENT_TYPE_LABEL[eventType][locale]}</p>
              <h2 className="mb-1 font-serif text-2xl">{t('wizard.basics.title')}</h2>
              <p className="text-sm text-stone-500">{t('wizard.basics.body')}</p>
            </div>
            <div className={`grid gap-3 ${two ? 'grid-cols-2' : ''}`}>
              <div><label className={label}>{t(two ? 'contact.partnerA' : 'contact.name')}</label><input className={field} autoFocus value={draft.partnerA} onChange={(e) => setD({ partnerA: e.target.value })} placeholder={two ? 'Ana' : 'Sofía Valentina'} /></div>
              {two ? <div><label className={label}>{t('contact.partnerB')}</label><input className={field} value={draft.partnerB} onChange={(e) => setD({ partnerB: e.target.value })} placeholder="Luis" /></div> : null}
            </div>
            <div><label className={label}>{t('wizard.details.date')}</label><input type="date" className={field} value={draft.date} onChange={(e) => setD({ date: e.target.value })} /></div>
            <button type="button" onClick={() => setStep(0)} className="text-xs text-stone-500 underline underline-offset-4">{t('wizard.basics.changeType')}</button>
          </section>
        ) : null}

        {/* 3. vista previa con diseño y detalles a la mano */}
        {current === 'preview' && draftKey ? (
          <PreviewStep draftKey={draftKey} express={false} locale={locale} version={previewVersion} email={contact.email}>
            <div className="space-y-2">
              {(['design', 'details'] as const).map((p) => (
                <div key={p} className="rounded-sm border border-stone-200 bg-white">
                  <button type="button" onClick={() => setPanel(panel === p ? null : p)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                    <span>{t(`wizard.preview.${p}`)}</span>
                    <span className="text-stone-400">{panel === p ? '−' : '+'}</span>
                  </button>
                  {panel === p ? (
                    <div className="border-t border-stone-100 p-4">
                      {p === 'design' ? <DesignStep d={draft} set={setD} locale={locale} fontClasses={fontClasses} /> : <DetailsStep d={draft} set={setD} draftKey={draftKey} eventType={eventType} contact={contact} setContact={setContact} express={express} showContact={false} showNames={false} />}
                    </div>
                  ) : null}
                </div>
              ))}
              {dirty ? <p className="text-center text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">{t('wizard.preview.refreshing')}</p> : null}
            </div>
          </PreviewStep>
        ) : null}

        {/* 4. paquete */}
        {current === 'package' ? (
          <section>
            <h2 className="mb-1 font-serif text-2xl">{t('package.title')}</h2>
            <p className="mb-4 text-sm text-stone-500">{t('wizard.package.body')}</p>
            {!packages.length ? <p className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('wizard.package.none')}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((p) => (
                <button key={p.code} type="button" onClick={() => setPkgCode(p.code)} aria-pressed={pkgCode === p.code}
                  className={`rounded-sm border p-4 text-left ${pkgCode === p.code ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-xl">{p.name}</span>
                    <span className="text-sm">{fmt(p.price, p.currency)}</span>
                  </div>
                  {p.code === POPULAR ? <span className="mt-1 inline-block rounded-full bg-[#eef0ea] px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-[#7d8471]">{t('package.popular')}</span> : null}
                  {isExpress(p.code) ? <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-amber-800">⚡ {t('package.fast')}</span> : null}
                  <ul className="mt-3 space-y-1 text-xs text-stone-600">
                    {p.features.filter((f) => featureLabels[f]).map((f) => <li key={f}>· {featureLabels[f]}</li>)}
                  </ul>
                  {isExpress(p.code) ? <p className="mt-3 text-xs leading-relaxed text-stone-500">{t('package.express')}</p> : null}
                </button>
              ))}
            </div>
            {express && draftKey ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-sm text-stone-500">{t('wizard.package.expressPreview')}</p>
                <img src={`/api/preview/express/${draftKey}?v=${previewVersion}`} alt="" width={520} height={820} className="w-full max-w-xs rounded-sm border border-stone-200 shadow-lg" draggable={false} onContextMenu={(e) => e.preventDefault()} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 5. extras */}
        {current === 'extras' ? (
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

        {/* 6. quién la termina */}
        {current === 'mode' ? (
          <section>
            <h2 className="mb-4 font-serif text-2xl">{t('mode.title')}</h2>
            <div className="space-y-2">
              {(['self', 'team', 'planner'] as const).map((m) => (
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

        {/* 7. pago (con tus datos) */}
        {current === 'payment' ? (
          <section className="space-y-5">
            <h2 className="font-serif text-2xl">{t('payment.title')}</h2>
            <div className="space-y-3 rounded-sm border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-500">{t(express ? 'wizard.details.contactBodyExpress' : 'wizard.details.contactBody')}</p>
              <div><label className={label}>{t('contact.email')}</label><input type="email" className={field} required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div><label className={label}>{t('contact.phone')}</label><input type="tel" className={field} required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="55 1234 5678" /></div>
                <div><label className={label}>{t('contact.country')}</label>
                  <select className={field} value={contact.country} onChange={(e) => setContact({ ...contact, country: e.target.value })}>{region === 'MX' ? <option value="MX">México</option> : <><option value="US">USA</option><option value="CA">Canadá</option></>}</select></div>
              </div>
            </div>
            <dl className="rounded-sm bg-stone-50 p-4 text-sm">
              <div className="flex justify-between"><dt>{t('payment.package')} · {pkg?.name}</dt><dd>{fmt(pkg?.price ?? 0, currency)}</dd></div>
              {chosenExtras.map((e) => <div key={e.code} className="flex justify-between text-stone-600"><dt>{e.name}</dt><dd>{fmt(e.price, currency)}</dd></div>)}
              <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-medium"><dt>{t('payment.total')}</dt><dd>{fmt(total, currency)}</dd></div>
            </dl>

            <div className="grid grid-cols-3 gap-2">
              {(['card_sim', 'apple_pay', 'transfer'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                  className={`rounded-sm border px-2 py-3 text-center ${method === m ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'}`}>
                  <span className="block text-sm">{t(m === 'card_sim' ? 'payment.card' : m === 'apple_pay' ? 'payment.applePay' : 'payment.transfer')}</span>
                  <span className={`mt-0.5 block text-[0.6rem] uppercase tracking-widest ${method === m ? 'text-white/70' : 'text-stone-400'}`}>{t(m === 'transfer' ? 'payment.transferTime' : 'payment.instant')}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500">{t(instant ? (express ? 'payment.instantHelpExpress' : 'payment.instantHelp') : 'payment.transferHelp')}</p>

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
            ) : method === 'apple_pay' ? (
              <div className="rounded-sm border border-stone-200 p-4 text-center">
                <span className="inline-block rounded-md bg-black px-5 py-2 text-sm font-medium text-white"> Pay</span>
                <p className="mt-2 text-xs text-amber-800">{t('payment.applePayHelp')}</p>
              </div>
            ) : null}

            <label className="flex items-start gap-3 text-xs leading-relaxed text-stone-600">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-stone-900" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.rich('payment.consent', { link: (c) => <a href={`/legal/privacidad?lang=${locale}`} target="_blank" className="underline">{c}</a> })}</span>
            </label>

            {result && !result.ok ? <p role="alert" className="rounded-sm bg-red-50 px-3 py-2 text-xs text-red-800">{t(`errors.${result.error}`)}</p> : null}
          </section>
        ) : null}

        {draftError ? <p role="alert" className="mt-4 rounded-sm bg-red-50 px-3 py-2 text-xs text-red-800">{draftError}</p> : null}
        {current !== 'type' ? (
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? <button type="button" onClick={() => { setStep(step - 1); setPanel(null); }} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">{t('back')}</button> : <span />}
            <div className="flex items-center gap-4">
              {step >= STEPS.indexOf('package') ? <span className="text-sm text-stone-500">{t('payment.total')}: <strong className="text-stone-900">{fmt(total, currency)}</strong></span> : null}
              {step < STEPS.length - 1 ? (
                <button type="button" disabled={!canNext[current] || pending} onClick={goNext} className="rounded-full bg-stone-900 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white disabled:opacity-40">
                  {pending ? '…' : t(current === 'basics' ? 'wizard.basics.next' : current === 'preview' ? 'wizard.preview.next' : 'next')}
                </button>
              ) : (
                <button type="submit" disabled={pending || !contactOk} className="rounded-full bg-stone-900 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white disabled:opacity-60">
                  {pending ? t('payment.sending') : instant ? t('payment.pay', { total: fmt(total, currency) }) : t('payment.reserve')}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}

/** Encabezado y actos sugeridos por tipo de evento (el cliente no escribe nada de eso). */
function withPreset(d: DraftData, type: EventType, locale: Locale): DraftData {
  const p = presetFor(type);
  return {
    ...d,
    headline: p.headline[locale],
    acts: p.acts.map((a) => ({ kind: a.kind, title: a.title[locale], time: '', venue: '', address: '', mapsUrl: '' })),
  };
}
