'use client';

import { useTranslations } from 'next-intl';
import type { DraftData } from '@/lib/drafts';
import { needsTwoNames, type EventType } from '@/lib/event-types';
import { DraftPhotoField } from './DraftPhotoField';

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none';
const label = 'mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-stone-500';
const KINDS = ['civil', 'religiosa', 'recepcion', 'otro'] as const;

/** Los datos de la invitación. Solo lo que sale impreso; lo demás se completa en el panel. */
export function DetailsStep({ d, set, draftKey, eventType, contact, setContact, express }: {
  d: DraftData; set: (patch: Partial<DraftData>) => void; draftKey: string; eventType: EventType;
  contact: { email: string; phone: string; country: string }; setContact: (c: { email: string; phone: string; country: string }) => void; express: boolean;
}) {
  const t = useTranslations('store');
  const two = needsTwoNames(eventType);
  const setAct = (i: number, patch: Partial<DraftData['acts'][number]>) => set({ acts: d.acts.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h2 className="font-serif text-2xl">{t('wizard.details.who')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>{t(two ? 'contact.partnerA' : 'contact.name')}</label><input className={field} value={d.partnerA} onChange={(e) => set({ partnerA: e.target.value })} /></div>
          <div><label className={label}>{t(two ? 'contact.partnerB' : 'contact.secondName')}</label><input className={field} value={d.partnerB} onChange={(e) => set({ partnerB: e.target.value })} /></div>
        </div>
        <div><label className={label}>{t('wizard.details.headline')}</label><input className={field} value={d.headline} onChange={(e) => set({ headline: e.target.value })} /></div>
        <div><label className={label}>{t('wizard.details.date')}</label><input type="date" className={field} value={d.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div><label className={label}>{t('wizard.details.message')}</label><textarea className={`${field} min-h-16`} value={d.message} onChange={(e) => set({ message: e.target.value })} placeholder={t('wizard.details.messagePlaceholder')} /></div>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">{t('wizard.details.where')}</h2>
        <p className="text-sm text-stone-500">{t('wizard.details.whereBody')}</p>
        {d.acts.map((a, i) => (
          <div key={i} className="space-y-2 rounded-sm border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <select className={`${field} w-auto`} value={a.kind} onChange={(e) => setAct(i, { kind: e.target.value as (typeof KINDS)[number] })}>
                {KINDS.map((k) => <option key={k} value={k}>{t(`wizard.details.kinds.${k}`)}</option>)}
              </select>
              {d.acts.length > 1 ? <button type="button" onClick={() => set({ acts: d.acts.filter((_, j) => j !== i) })} className="text-xs text-stone-500 underline underline-offset-4">{t('wizard.details.remove')}</button> : null}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input className={field} value={a.title} onChange={(e) => setAct(i, { title: e.target.value })} placeholder={t('wizard.details.actTitle')} />
              <input type="time" className={`${field} w-28`} value={a.time} onChange={(e) => setAct(i, { time: e.target.value })} />
            </div>
            <input className={field} value={a.venue} onChange={(e) => setAct(i, { venue: e.target.value })} placeholder={t('wizard.details.venue')} />
            <input className={field} value={a.address} onChange={(e) => setAct(i, { address: e.target.value })} placeholder={t('wizard.details.address')} />
            <input className={field} value={a.mapsUrl} onChange={(e) => setAct(i, { mapsUrl: e.target.value })} placeholder={t('wizard.details.maps')} inputMode="url" />
          </div>
        ))}
        {d.acts.length < 4 ? <button type="button" onClick={() => set({ acts: [...d.acts, { kind: 'recepcion', title: '', time: '', venue: '', address: '', mapsUrl: '' }] })} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs">+ {t('wizard.details.addAct')}</button> : null}
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">{t('wizard.details.parents')}</h2>
        <p className="text-sm text-stone-500">{t('wizard.details.parentsBody')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>{t(two ? 'wizard.details.parentsBride' : 'wizard.details.parentsOne')}</label><textarea className={`${field} min-h-16`} value={d.parentsA} onChange={(e) => set({ parentsA: e.target.value })} placeholder={t('wizard.details.parentsPlaceholder')} /></div>
          <div><label className={label}>{t(two ? 'wizard.details.parentsGroom' : 'wizard.details.parentsTwo')}</label><textarea className={`${field} min-h-16`} value={d.parentsB} onChange={(e) => set({ parentsB: e.target.value })} placeholder={t('wizard.details.parentsPlaceholder')} /></div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">{t('wizard.details.photos')}</h2>
        <p className="text-sm text-stone-500">{t('wizard.details.photosBody')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <DraftPhotoField key={i} draftKey={draftKey} value={d.photos[i] ?? ''} onChange={(url) => { const photos = [...d.photos]; photos[i] = url; set({ photos: photos.map((p) => p ?? '') }); }} label={`${t('wizard.details.photo')} ${i + 1}`} hint={t('wizard.details.photoHint')} removeLabel={t('wizard.details.remove')} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">{t('wizard.details.extras')}</h2>
        <div><label className={label}>{t('wizard.details.dressCode')}</label><input className={field} value={d.dressCode} onChange={(e) => set({ dressCode: e.target.value })} placeholder={t('wizard.details.dressCodePlaceholder')} /></div>
        <div><label className={label}>{t('wizard.details.gifts')}</label><textarea className={`${field} min-h-16`} value={d.giftsNote} onChange={(e) => set({ giftsNote: e.target.value })} placeholder={t(express ? 'wizard.details.giftsPlaceholderExpress' : 'wizard.details.giftsPlaceholder')} /></div>
      </div>

      <div className="space-y-3 rounded-sm border border-stone-200 bg-white p-4">
        <h2 className="font-serif text-2xl">{t('wizard.details.contact')}</h2>
        <p className="text-sm text-stone-500">{t(express ? 'wizard.details.contactBodyExpress' : 'wizard.details.contactBody')}</p>
        <div><label className={label}>{t('contact.email')}</label><input type="email" className={field} required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div><label className={label}>{t('contact.phone')}</label><input type="tel" className={field} required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="55 1234 5678" /></div>
          <div><label className={label}>{t('contact.country')}</label>
            <select className={field} value={contact.country} onChange={(e) => setContact({ ...contact, country: e.target.value })}><option value="MX">México</option><option value="US">USA</option><option value="CA">Canadá</option></select></div>
        </div>
      </div>
    </section>
  );
}
