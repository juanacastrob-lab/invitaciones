'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import jsQR from 'jsqr';
import { checkIn, checkinSnapshot, type CheckinGuest } from '@/actions/checkin';
import { checkinTotals, tokenFromScan } from '@/lib/checkin';
import { Button, Input, Notice } from '@/components/ui';

/**
 * Pantalla del día del evento, pensada para el celular en la puerta:
 * cámara arriba, buscador abajo, contador en vivo. Cada escaneo o toque
 * llama a la base; el listado se refresca solo cada 15 s.
 */
export function CheckinScreen({ eventId, slug, initial, demo = false }: { eventId: string; slug: string; initial: CheckinGuest[]; demo?: boolean }) {
  const t = useTranslations('checkin');
  const [guests, setGuests] = useState<CheckinGuest[]>(initial);
  const [q, setQ] = useState('');
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [last, setLast] = useState<{ kind: 'ok' | 'already' | 'error'; text: string; guest?: CheckinGuest } | null>(null);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastCode = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const totals = checkinTotals(guests);

  const apply = useCallback((g: CheckinGuest) => setGuests((prev) => prev.map((x) => (x.id === g.id ? g : x))), []);

  const refresh = useCallback(async () => {
    if (demo) return;
    try { setGuests(await checkinSnapshot(eventId)); } catch { /* sin red: se reintenta en el siguiente ciclo */ }
  }, [eventId, demo]);

  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const mark = useCallback(async (args: { token?: string; guestId?: string }, count: number | null) => {
    if (busy) return;
    setBusy(true);
    try {
      if (demo) {
        const g = guests.find((x) => x.id === args.guestId) ?? guests[0];
        const n = count ?? (g.status === 'confirmed' ? Math.max(1, g.confirmed_count) : g.passes);
        const next = { ...g, checked_in_count: n, checked_in_at: n > 0 ? new Date().toISOString() : null };
        apply(next);
        setLast({ kind: n > 0 ? 'ok' : 'error', text: n > 0 ? t('arrived', { name: next.display_name, count: n }) : t('undone', { name: next.display_name }), guest: next });
        return;
      }
      const r = await checkIn({ eventId, count, ...args });
      if (!r.ok) {
        setLast({ kind: 'error', text: r.error === 'not_found' ? t('errNotFound') : r.error === 'denied' ? t('errDenied') : (r.message ?? t('errUnknown')) });
        if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
        return;
      }
      apply(r.guest);
      if (count === 0) setLast({ kind: 'ok', text: t('undone', { name: r.guest.display_name }), guest: r.guest });
      else if (r.already) setLast({ kind: 'already', text: t('already', { name: r.guest.display_name, count: r.guest.checked_in_count }), guest: r.guest });
      else setLast({ kind: 'ok', text: t('arrived', { name: r.guest.display_name, count: r.guest.checked_in_count }), guest: r.guest });
      if (navigator.vibrate) navigator.vibrate(r.already ? [40, 40, 40] : 60);
    } finally {
      setBusy(false);
    }
  }, [busy, demo, guests, eventId, apply, t]);

  // ------------------------------------------------------------- cámara
  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play(); }
      setScanning(true);
    } catch (e) {
      setCamError(t('camError', { message: (e as Error).message }));
    }
  }, [t]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!scanning) return;
    let raf = 0;
    let lastTick = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastTick < 200) return;
      lastTick = now;
      const v = video.current, c = canvas.current;
      if (!v || !c || v.readyState < 2) return;
      const w = Math.min(v.videoWidth, 640), h = Math.round(v.videoHeight * (w / v.videoWidth));
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (!code?.data) return;
      // El mismo QR frente a la cámara no se marca dos veces seguidas.
      if (code.data === lastCode.current.text && now - lastCode.current.at < 4000) return;
      lastCode.current = { text: code.data, at: now };
      const token = tokenFromScan(code.data, slug);
      if (!token) { setLast({ kind: 'error', text: t('errOtherQr') }); return; }
      // Llegan los que confirmó (o sus pases si no confirmó); se ajusta después con + / −.
      void mark({ token }, null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scanning, slug, mark, t]);

  const visible = guests
    .filter((g) => !q.trim() || `${g.display_name} ${g.table_no ?? ''} ${g.group_tag ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(a.checked_in_at)) - Number(Boolean(b.checked_in_at)) || a.display_name.localeCompare(b.display_name));

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-sm border border-stone-200 bg-white p-3"><dt className="text-[0.6rem] uppercase tracking-widest text-stone-500">{t('arrivedLabel')}</dt><dd className="font-serif text-3xl">{totals.arrivedPeople}</dd></div>
        <div className="rounded-sm border border-stone-200 bg-white p-3"><dt className="text-[0.6rem] uppercase tracking-widest text-stone-500">{t('expected')}</dt><dd className="font-serif text-3xl">{totals.expected}</dd></div>
        <div className="rounded-sm border border-stone-200 bg-white p-3"><dt className="text-[0.6rem] uppercase tracking-widest text-stone-500">{t('groups')}</dt><dd className="font-serif text-3xl">{totals.arrivedGroups}<span className="text-base text-stone-400">/{totals.confirmedGroups}</span></dd></div>
      </dl>

      <section className="overflow-hidden rounded-sm border border-stone-200 bg-black">
        <div className="relative aspect-[4/3]">
          <video ref={video} className={`h-full w-full object-cover ${scanning ? '' : 'hidden'}`} muted playsInline />
          <canvas ref={canvas} className="hidden" />
          {!scanning ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/80">
              <p>{t('pointCamera')}</p>
              <Button type="button" variant="secondary" onClick={startCamera} className="border-white/70 text-white hover:border-white">{t('openCamera')}</Button>
            </div>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-0 m-auto h-44 w-44 rounded-lg border-2 border-white/80" />
              <button type="button" onClick={stopCamera} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{t('close')}</button>
            </>
          )}
        </div>
        {camError ? <p className="bg-red-50 px-3 py-2 text-xs text-red-800">{camError}</p> : null}
      </section>

      {last ? (
        <div className={`rounded-sm border p-3 text-sm ${last.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : last.kind === 'already' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`} role="status">
          <p className="font-medium">{last.text}</p>
          {last.guest ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span>{last.guest.status === 'confirmed' ? t('confirmed', { count: last.guest.confirmed_count }) : last.guest.status === 'declined' ? t('declined') : t('pending')} · {t('passes', { count: last.guest.passes })}{last.guest.table_no ? ` · ${t('table', { table: last.guest.table_no })}` : ''}</span>
              <span className="ml-auto flex items-center gap-1">
                <Button variant="secondary" disabled={busy || last.guest.checked_in_count <= 0} onClick={() => mark({ guestId: last.guest!.id }, last.guest!.checked_in_count - 1)}>−</Button>
                <span className="w-8 text-center text-base">{last.guest.checked_in_count}</span>
                <Button variant="secondary" disabled={busy || last.guest.checked_in_count >= last.guest.passes} onClick={() => mark({ guestId: last.guest!.id }, last.guest!.checked_in_count + 1)}>+</Button>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} />
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {visible.slice(0, 80).map((g) => (
          <li key={g.id} className={`flex items-center justify-between gap-3 p-3 text-sm ${g.checked_in_at ? 'bg-emerald-50/60' : ''}`}>
            <div className="min-w-0">
              <p className="truncate font-medium">{g.display_name}</p>
              <p className="text-xs text-stone-500">{g.status === 'confirmed' ? t('confirmed', { count: g.confirmed_count }) : g.status === 'declined' ? t('declined') : t('pending')} · {t('passes', { count: g.passes })}{g.table_no ? ` · ${t('table', { table: g.table_no })}` : ''}{g.checked_in_at ? ` · ${t('arrivedShort', { count: g.checked_in_count })}` : ''}</p>
            </div>
            {g.checked_in_at ? (
              <Button variant="ghost" disabled={busy} onClick={() => mark({ guestId: g.id }, 0)}>{t('undo')}</Button>
            ) : (
              <Button variant="secondary" disabled={busy} onClick={() => mark({ guestId: g.id }, Math.max(1, g.status === 'confirmed' ? g.confirmed_count : g.passes))}>{t('markArrived')}</Button>
            )}
          </li>
        ))}
        {!visible.length ? <li className="p-4 text-center text-xs text-stone-500">{t('noMatch')}</li> : null}
      </ul>
      {!demo ? <p className="text-center text-[0.65rem] text-stone-400">{t('autoRefresh')}</p> : null}
    </div>
  );
}
