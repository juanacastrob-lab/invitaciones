'use client';

import type { ReactNode } from 'react';
import type { Locale } from '@/lib/config';
import type { LT } from '@/lib/editor/draft';
import { Button, inputClass } from '@/components/ui';

/** Piezas del editor: campo por idioma, tarjeta de sección y fila de lista. */

const labelClass = 'mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500';

export function Text({ label, value, onChange, hint, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder={placeholder} />
      {hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

/** Un texto en cada idioma del evento, con la etiqueta ES/EN pegada al campo. */
export function LTInput({ label, value, onChange, langs, multiline, hint }: { label: string; value: LT; onChange: (v: LT) => void; langs: Locale[]; multiline?: boolean; hint?: string }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="space-y-1.5">
        {langs.map((l) => (
          <div key={l} className="flex items-start gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-[0.6rem] uppercase tracking-widest text-stone-400">{l}</span>
            {multiline ? (
              <textarea value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className={`${inputClass} min-h-24`} />
            ) : (
              <input value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className={inputClass} />
            )}
          </div>
        ))}
      </div>
      {hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-stone-900" />
      {label}
    </label>
  );
}

export function SectionCard({
  id, title, enabled, onToggle, onMove, canUp, canDown, labels, children, error,
}: {
  id: string;
  title: string;
  enabled: boolean;
  onToggle?: (on: boolean) => void;
  onMove?: (dir: -1 | 1) => void;
  canUp?: boolean;
  canDown?: boolean;
  labels: { show: string; up: string; down: string };
  children: ReactNode;
  error?: string;
}) {
  return (
    <section id={`sec-${id}`} className={`rounded-sm border bg-white ${error ? 'border-red-300' : 'border-stone-200'} ${enabled ? '' : 'opacity-70'}`}>
      <header className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        {onToggle ? (
          <label className="flex items-center gap-2" title={labels.show}>
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 accent-stone-900" />
          </label>
        ) : null}
        <h2 className="flex-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-700">{title}</h2>
        {onMove && enabled ? (
          <div className="flex gap-1">
            <button type="button" aria-label={labels.up} disabled={!canUp} onClick={() => onMove(-1)} className="h-7 w-7 rounded-full border border-stone-200 text-stone-600 disabled:opacity-30">↑</button>
            <button type="button" aria-label={labels.down} disabled={!canDown} onClick={() => onMove(1)} className="h-7 w-7 rounded-full border border-stone-200 text-stone-600 disabled:opacity-30">↓</button>
          </div>
        ) : null}
      </header>
      {error ? <p className="bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}
      {enabled ? <div className="space-y-4 p-4">{children}</div> : null}
    </section>
  );
}

/** Un elemento de una lista (acto, link, foto...) con su botón de quitar. */
export function Item({ title, onRemove, removeLabel, children }: { title: string; onRemove: () => void; removeLabel: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-sm border border-stone-100 bg-stone-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{title}</span>
        <Button variant="ghost" type="button" onClick={onRemove}>{removeLabel}</Button>
      </div>
      {children}
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button variant="secondary" type="button" onClick={onClick}>+ {label}</Button>;
}
