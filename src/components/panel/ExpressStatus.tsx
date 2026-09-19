'use client';

import { useEffect, useState } from 'react';

/** Express: cuenta regresiva hasta que el PDF esté listo; luego el botón de descarga. */
export function ExpressStatus({ deliverAt, delivered, pdfHref, labels }: { deliverAt: string | null; delivered: boolean; pdfHref: string; labels: { building: string; ready: string; download: string; sentTo: string } }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = deliverAt ? new Date(deliverAt).getTime() : null;
  const left = target ? Math.max(0, target - now) : 0;
  const ready = delivered || (target !== null && left === 0);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  if (ready) {
    return (
      <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-emerald-800">{labels.ready}</p>
        <p className="mt-1 text-sm text-emerald-900">{labels.sentTo}</p>
        <a href={pdfHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white">{labels.download}</a>
      </div>
    );
  }
  return (
    <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-amber-800">{labels.building}</p>
      <p className="mt-1 font-serif text-4xl tabular-nums text-amber-900">{mm}:{ss}</p>
    </div>
  );
}
