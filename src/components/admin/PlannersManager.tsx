'use client';

import { useState, useTransition } from 'react';
import { createPlanner, updatePlanner, setCommissionPaid } from '@/actions/admin-planners';
import type { CommissionOrder, PlannerRow } from '@/lib/admin/queries';
import type { ActionResult } from '@/schemas/admin';
import { Badge, Button, Field, Input, Notice } from '@/components/ui';

const fmt = (n: number, cur = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

function PlannerCard({ p, orders, siteUrl }: { p: PlannerRow; orders: CommissionOrder[]; siteUrl: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: p.name, email: p.email, phone: p.phone ?? '', code: p.code, commissionPct: String(p.commission_pct), notes: p.notes ?? '', active: p.active });
  const pendingAmt = orders.filter((o) => o.status === 'pagado' && !o.commission_paid_at).reduce((s, o) => s + o.commission_amount, 0);
  const paidAmt = orders.filter((o) => o.commission_paid_at).reduce((s, o) => s + o.commission_amount, 0);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  return (
    <li className={`space-y-3 p-4 ${p.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{p.name} <span className="ml-1 text-xs text-stone-500">{p.email}</span>{!p.active ? <span className="ml-2"><Badge>inactivo</Badge></span> : null}</p>
          <p className="text-xs text-stone-500">Código <strong>{p.code}</strong> · {p.commission_pct}% · {p.user_id ? 'ya entró a la app' : 'todavía no entra'}</p>
          <p className="break-all text-xs text-stone-500">{siteUrl}/comprar?ref={p.code}</p>
        </div>
        <div className="text-right text-xs">
          <p>Por pagar: <strong className="text-amber-800">{fmt(pendingAmt)}</strong></p>
          <p className="text-stone-500">Pagado: {fmt(paidAmt)} · {orders.length} pedidos</p>
          <Button variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? 'Cerrar' : 'Editar / pedidos'}</Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 rounded-sm bg-stone-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
            <Field label="Correo"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código"><Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="% comisión"><Input inputMode="decimal" value={v.commissionPct} onChange={(e) => setV({ ...v, commissionPct: e.target.value })} /></Field>
            </div>
          </div>
          <Field label="Notas"><Input value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Activo</label>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => updatePlanner(p.id, v))}>Guardar</Button>
          </div>
          <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                <span>#{o.number} · {o.contact.partner_a}{o.contact.partner_b ? ` & ${o.contact.partner_b}` : ''} · {fmt(o.total, o.currency)} · <Badge tone={o.status === 'pagado' ? 'green' : 'amber'}>{o.status}</Badge></span>
                <span className="flex items-center gap-2">
                  <strong>{fmt(o.commission_amount, o.currency)}</strong>
                  {o.commission_paid_at ? (
                    <><Badge tone="green">pagada</Badge><Button variant="ghost" disabled={pending} onClick={() => run(() => setCommissionPaid(o.id, false))}>Deshacer</Button></>
                  ) : o.status === 'pagado' ? (
                    <Button variant="secondary" disabled={pending} onClick={() => { if (window.confirm(`¿Marcar pagada la comisión de ${fmt(o.commission_amount, o.currency)}?`)) run(() => setCommissionPaid(o.id, true)); }}>Pagar</Button>
                  ) : <span className="text-xs text-stone-400">espera el pago del cliente</span>}
                </span>
              </li>
            ))}
            {!orders.length ? <li className="p-3 text-center text-xs text-stone-500">Sin pedidos todavía.</li> : null}
          </ul>
        </div>
      ) : null}
      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}
    </li>
  );
}

export function PlannersManager({ planners, orders, siteUrl }: { planners: PlannerRow[]; orders: CommissionOrder[]; siteUrl: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [v, setV] = useState({ name: '', email: '', phone: '', code: '', commissionPct: '10', notes: '' });
  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Nuevo planner</h2>
        <p className="mb-3 text-xs text-stone-500">Le das su link con código; los pedidos que entren por ahí llevan su comisión. Con ese correo entra a la app como cualquier cliente y ve sus pedidos y comisiones en el panel.</p>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createPlanner(v); setResult(r); if (r.ok) setV({ name: '', email: '', phone: '', code: '', commissionPct: '10', notes: '' }); }); }}>
          <Field label="Nombre"><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Correo"><Input type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="+52..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" hint="4 a 12 letras o números"><Input required value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="PAU10" /></Field>
            <Field label="% comisión"><Input inputMode="decimal" required value={v.commissionPct} onChange={(e) => setV({ ...v, commissionPct: e.target.value })} /></Field>
          </div>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Dar de alta</Button></div>
        </form>
        {result ? <div className="mt-3"><Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice></div> : null}
      </section>
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {planners.map((p) => <PlannerCard key={p.id} p={p} orders={orders.filter((o) => o.planner_id === p.id)} siteUrl={siteUrl} />)}
        {!planners.length ? <li className="p-6 text-center text-sm text-stone-500">Todavía no hay planners.</li> : null}
      </ul>
    </div>
  );
}
