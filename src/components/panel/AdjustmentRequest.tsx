'use client';

import { useState, useTransition } from 'react';
import { requestAdjustment } from '@/actions/adjustments';

/** "Pedir un ajuste": cae como tarea en el CRM, no como llamada. */
export function AdjustmentRequest({ eventId, labels }: { eventId: string; labels: { button: string; title: string; hint: string; placeholder: string; send: string; sent: string } }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="rounded-sm border border-stone-200 bg-white p-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs uppercase tracking-[0.2em] text-stone-700 underline underline-offset-4">{labels.button}</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestAdjustment(eventId, text); setMsg({ ok: r.ok, text: r.ok ? labels.sent : r.error }); if (r.ok) setText(''); }); }} className="space-y-2">
          <p className="text-sm font-medium">{labels.title}</p>
          <p className="text-xs text-stone-500">{labels.hint}</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} required minLength={5} maxLength={2000} placeholder={labels.placeholder} className="min-h-24 w-full rounded-sm border border-stone-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={pending || text.trim().length < 5} className="rounded-full bg-stone-900 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-40">{labels.send}</button>
          {msg ? <p className={`text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p> : null}
        </form>
      )}
    </div>
  );
}
