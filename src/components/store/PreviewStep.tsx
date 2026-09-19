'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { emailDraftLink } from '@/actions/draft';
import type { Locale } from '@/lib/config';

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none';

/** Vista previa: imagen chica para Express, la invitación real (temporal) para los paquetes web. */
export function PreviewStep({ draftKey, express, locale, version, email }: { draftKey: string; express: boolean; locale: Locale; version: number; email: string }) {
  const t = useTranslations('store');
  const [to, setTo] = useState(email);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const previewUrl = `/preview/${draftKey}${locale === 'en' ? '?lang=en' : ''}`;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="mb-1 font-serif text-2xl">{t('wizard.preview.title')}</h2>
        <p className="text-sm text-stone-500">{t(express ? 'wizard.preview.bodyExpress' : 'wizard.preview.body')}</p>
      </div>
      {express ? (
        <div className="flex justify-center">
          <img src={`/api/preview/express/${draftKey}?v=${version}`} alt={t('wizard.preview.title')} width={520} height={820} className="w-full max-w-sm rounded-sm border border-stone-200 shadow-lg" draggable={false} onContextMenu={(e) => e.preventDefault()} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-[390px] overflow-hidden rounded-[2rem] border-8 border-stone-900 bg-stone-900 shadow-xl">
            <iframe src={previewUrl} title={t('wizard.preview.title')} className="h-[700px] w-full bg-white" />
          </div>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-[0.2em] text-stone-700 underline underline-offset-4">{t('wizard.preview.open')}</a>
        </div>
      )}
      <div className="rounded-sm border border-stone-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium">{t('wizard.preview.saveTitle')}</p>
        <p className="mb-3 text-xs text-stone-500">{t('wizard.preview.saveBody')}</p>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await emailDraftLink(draftKey, to, locale); setMsg({ ok: r.ok, text: r.ok ? r.message ?? '' : r.error }); }); }}>
          <input type="email" className={field} value={to} onChange={(e) => setTo(e.target.value)} placeholder="tu@correo.com" required />
          <button type="submit" disabled={pending} className="shrink-0 rounded-full border border-stone-300 px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-stone-700">{t('wizard.preview.saveButton')}</button>
        </form>
        {msg ? <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p> : null}
        <p className="mt-2 break-all text-[0.65rem] text-stone-400">{typeof window !== 'undefined' ? `${window.location.origin}/comprar?d=${draftKey}` : `/comprar?d=${draftKey}`}</p>
      </div>
    </section>
  );
}
