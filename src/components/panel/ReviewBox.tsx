'use client';

import { useState, useTransition } from 'react';
import { submitReview } from '@/actions/reviews';

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm';

/** "¿Nos dejas una reseña?" en el panel, cuando la invitación ya está entregada o publicada. */
export function ReviewBox({ eventId, defaultName, existing, labels }: {
  eventId: string; defaultName: string; existing: { rating: number; body: string; approved: boolean } | null;
  labels: { title: string; hint: string; name: string; city: string; rating: string; body: string; placeholder: string; consent: string; send: string; thanks: string; already: string };
}) {
  const [f, setF] = useState({ authorName: defaultName, city: '', rating: 5, body: '', consent: false });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (existing || msg?.ok) {
    return (
      <div className="rounded-sm border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <p>{msg?.ok ? labels.thanks : labels.already}</p>
        {existing ? <p className="mt-2 text-stone-800">{'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)} <span className="italic">“{existing.body}”</span></p> : null}
      </div>
    );
  }
  return (
    <form className="space-y-3 rounded-sm border border-stone-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitReview({ eventId, ...f }); setMsg({ ok: r.ok, text: r.ok ? labels.thanks : r.error }); }); }}>
      <p className="font-serif text-xl">{labels.title}</p>
      <p className="text-xs text-stone-500">{labels.hint}</p>
      <div>
        <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{labels.rating}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setF({ ...f, rating: n })} aria-label={`${n}`} className={`text-2xl ${n <= f.rating ? 'text-stone-900' : 'text-stone-300'}`}>★</button>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{labels.name}</span><input className={field} required value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} /></label>
        <label className="block"><span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{labels.city}</span><input className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
      </div>
      <label className="block"><span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{labels.body}</span><textarea className={`${field} min-h-24`} required minLength={10} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder={labels.placeholder} /></label>
      <label className="flex items-start gap-2 text-xs text-stone-600"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-stone-900" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> {labels.consent}</label>
      <button type="submit" disabled={pending || !f.consent || f.body.trim().length < 10} className="rounded-full bg-stone-900 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-40">{labels.send}</button>
      {msg && !msg.ok ? <p className="text-xs text-red-700">{msg.text}</p> : null}
    </form>
  );
}
