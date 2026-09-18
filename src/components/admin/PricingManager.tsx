'use client';

import { useState, useTransition } from 'react';
import { updatePackage, updateExtra } from '@/actions/admin-pricing';
import type { PriceRow } from '@/lib/admin/queries';
import type { ActionResult } from '@/schemas/admin';
import { Button, Input, Notice, Textarea } from '@/components/ui';

function Row({ row, kind }: { row: PriceRow; kind: 'package' | 'extra' }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [v, setV] = useState({ name: row.name, price: String(row.price), active: row.active, description: row.description ?? '' });
  const dirty = v.name !== row.name || Number(v.price) !== row.price || v.active !== row.active || v.description !== (row.description ?? '');
  const save = () => start(async () => setResult(kind === 'package'
    ? await updatePackage({ id: row.id, name: v.name, price: v.price, active: v.active })
    : await updateExtra({ id: row.id, name: v.name, price: v.price, active: v.active, description: v.description })));
  return (
    <li className={`space-y-2 p-3 ${v.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1 text-xs text-stone-500">Nombre<Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label className="text-xs text-stone-500">Precio ({row.currency})<Input inputMode="decimal" className="w-28" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></label>
        <label className="flex items-center gap-2 pb-2 text-xs text-stone-600"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Activo</label>
        <Button variant="secondary" disabled={!dirty || pending} onClick={save}>{pending ? '…' : 'Guardar'}</Button>
      </div>
      {kind === 'extra' ? <Textarea className="min-h-12 text-xs" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /> : null}
      <p className="text-[0.65rem] uppercase tracking-widest text-stone-400">{row.code} · {row.country}{row.included_in?.length ? ` · incluido en ${row.included_in.join(', ')}` : ''}{row.features?.length ? ` · ${row.features.join(', ')}` : ''}</p>
      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}
    </li>
  );
}

export function PricingManager({ packages, extras }: { packages: PriceRow[]; extras: PriceRow[] }) {
  const countries = Array.from(new Set([...packages, ...extras].map((r) => r.country)));
  return (
    <div className="space-y-8">
      <p className="text-xs text-stone-500">Los cambios se ven en la landing y la tienda en cuanto guardas. Lo que se apaga deja de venderse, pero los pedidos ya hechos no cambian.</p>
      {countries.map((c) => (
        <div key={c} className="space-y-4">
          <h2 className="text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Paquetes · {c}</h2>
          <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
            {packages.filter((p) => p.country === c).map((p) => <Row key={p.id} row={p} kind="package" />)}
          </ul>
          <h2 className="text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Extras · {c}</h2>
          <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
            {extras.filter((p) => p.country === c).map((p) => <Row key={p.id} row={p} kind="extra" />)}
            {!extras.some((p) => p.country === c) ? <li className="p-4 text-center text-xs text-stone-500">Sin extras para este país.</li> : null}
          </ul>
        </div>
      ))}
    </div>
  );
}
