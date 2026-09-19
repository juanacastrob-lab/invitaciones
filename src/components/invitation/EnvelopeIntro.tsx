'use client';

import { useEffect, useState } from 'react';

/**
 * El sobre que se abre al tocar. Se muestra una vez por visita (sessionStorage):
 * al regresar de confirmar, la invitación ya está abierta. Al abrir, avisa a
 * la música por un evento; el navegador permite reproducir porque hubo toque.
 * Sin JavaScript no existe: el contenido está debajo y se ve igual.
 */
export function EnvelopeIntro({ names, initials, label, sealText }: { names: string; initials: string; label: string; sealText?: string }) {
  const [state, setState] = useState<'hidden' | 'closed' | 'opening' | 'gone'>('hidden');

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('hb-envelope') === '1'; } catch { /* modo privado */ }
    setState(seen ? 'gone' : 'closed');
  }, []);

  useEffect(() => {
    if (state === 'closed') document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [state]);

  if (state === 'hidden' || state === 'gone') return null;

  const open = () => {
    if (state !== 'closed') return;
    setState('opening');
    try { sessionStorage.setItem('hb-envelope', '1'); } catch { /* nada */ }
    window.dispatchEvent(new Event('hb:play'));
    setTimeout(() => setState('gone'), 1100);
  };

  const opening = state === 'opening';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(); }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--paper)] px-8 text-center transition-opacity duration-700 ${opening ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ transitionDelay: opening ? '400ms' : '0ms' }}
    >
      <p className="mb-8 text-[0.65rem] uppercase tracking-[0.35em] text-[var(--muted)]">{names}</p>
      <div className="relative h-44 w-64" style={{ perspective: '900px' }}>
        {/* cuerpo del sobre */}
        <div className="absolute inset-0 rounded-sm border border-[var(--line)] bg-[var(--accent-soft)] shadow-lg" />
        {/* solapas laterales e inferior */}
        <div className="absolute inset-0 overflow-hidden rounded-sm">
          <div className="absolute -left-1/2 top-0 h-full w-full origin-top-left rotate-[32deg] border-r border-[var(--line)] bg-[var(--paper)]/60" />
          <div className="absolute -right-1/2 top-0 h-full w-full origin-top-right -rotate-[32deg] border-l border-[var(--line)] bg-[var(--paper)]/60" />
        </div>
        {/* carta que sale */}
        <div className={`absolute inset-x-6 bottom-4 h-32 rounded-sm bg-white shadow-md transition-transform duration-700 ${opening ? '-translate-y-24' : ''}`} style={{ transitionDelay: opening ? '250ms' : '0ms' }}>
          <p className="mt-8 font-serif text-2xl text-[var(--ink)]">{initials}</p>
        </div>
        {/* solapa superior */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 origin-top border-b border-[var(--line)] bg-[var(--accent-soft)] transition-transform duration-700"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transform: opening ? 'rotateX(180deg)' : 'rotateX(0deg)', backfaceVisibility: 'hidden' }}
        />
        {/* sello */}
        <div className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent)] font-serif text-lg text-[var(--paper)] shadow transition-all duration-500 ${opening ? 'scale-0 opacity-0' : ''}`}>
          {sealText ?? initials}
        </div>
      </div>
      <p className="mt-10 animate-pulse text-[0.7rem] uppercase tracking-[0.3em] text-[var(--muted)]">{label}</p>
    </div>
  );
}
