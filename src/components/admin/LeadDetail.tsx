'use client';

import { useState, useTransition } from 'react';
import { addActivity, completeTask, deleteLead, updateLead } from '@/actions/crm';
import type { LeadRow, LeadActivityRow } from '@/lib/admin/queries';
import { LEAD_STAGES, STAGE_LABEL, STAGE_TONE, ACTIVITY_KINDS, ACTIVITY_LABEL, SOURCE_LABEL, LOST_REASONS, LOST_REASON_LABEL, followUpState, type LeadStage, type ActivityKind } from '@/lib/crm';
import { EVENT_TYPE_LABEL } from '@/lib/event-types';
import { whatsappLink } from '@/lib/config';
import { Badge, Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import type { ActionResult } from '@/schemas/admin';

const fmt = (iso: string) => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function LeadDetail({ lead: l, activities, team, conversationId, isAdmin, packages }: {
  lead: LeadRow; activities: LeadActivityRow[]; team: { user_id: string; name: string | null; email: string | null }[]; conversationId: string | null; isAdmin: boolean; packages: { code: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ partnerA: l.partner_a, partnerB: l.partner_b ?? '', email: l.email ?? '', eventDate: l.event_date ?? '', city: l.city ?? '', guestsEstimate: l.guests_estimate?.toString() ?? '', value: l.value?.toString() ?? '', packageCode: l.package_code ?? '', notes: l.notes ?? '' });
  const [act, setAct] = useState<{ kind: (typeof ACTIVITY_KINDS)[number]; body: string; dueAt: string }>({ kind: 'nota', body: '', dueAt: '' });
  const [lost, setLost] = useState<string>(l.lost_reason ?? 'no_contesto');
  const name = [l.partner_a, l.partner_b].filter(Boolean).join(' & ');
  const fu = followUpState(l.next_follow_up);
  const tasks = activities.filter((a) => a.kind === 'tarea' && !a.done_at);
  const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: l.currency || 'MXN', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      {/* ficha */}
      <aside className="space-y-4 md:order-2">
        <section className="rounded-sm border border-stone-200 bg-white p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-xl">{name}</p>
            <Badge tone={STAGE_TONE[l.stage as LeadStage] ?? 'neutral'}>{STAGE_LABEL[l.stage as LeadStage] ?? l.stage}</Badge>
          </div>
          <p className="mt-1 text-xs text-stone-500">{EVENT_TYPE_LABEL[l.event_type as keyof typeof EVENT_TYPE_LABEL]?.es ?? l.event_type}{l.event_date ? ` · ${l.event_date}` : ''}{l.city ? ` · ${l.city}` : ''}{l.guests_estimate ? ` · ~${l.guests_estimate} inv.` : ''}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={whatsappLink(`Hola ${l.partner_a}, soy de Hola Boda 🙂`, l.phone)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-3 py-1.5 text-xs text-white">WhatsApp</a>
            {conversationId ? <a href={`/admin/inbox/${conversationId}`} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs">Ver chat</a> : null}
            <a href={`tel:${l.phone}`} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs">Llamar</a>
            {l.email ? <a href={`mailto:${l.email}`} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs">Correo</a> : null}
          </div>
          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Teléfono</dt><dd>{l.phone}</dd></div>
            {l.email ? <div className="flex justify-between gap-2"><dt className="text-stone-500">Correo</dt><dd className="truncate">{l.email}</dd></div> : null}
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Llegó por</dt><dd>{SOURCE_LABEL[l.source ?? ''] ?? l.source ?? '—'}{l.utm_campaign ? ` · ${l.utm_campaign}` : ''}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Alta</dt><dd>{l.created_at.slice(0, 10)}</dd></div>
            {l.last_contact_at ? <div className="flex justify-between gap-2"><dt className="text-stone-500">Último contacto</dt><dd>{l.last_contact_at.slice(0, 10)}</dd></div> : null}
            {l.value != null ? <div className="flex justify-between gap-2"><dt className="text-stone-500">Valor</dt><dd>{money(l.value)}{l.package_code ? ` · ${l.package_code}` : ''}</dd></div> : null}
            {l.order_id ? <div className="flex justify-between gap-2"><dt className="text-stone-500">Pedido</dt><dd><a className="underline" href="/admin/orders">ver</a></dd></div> : null}
          </dl>
        </section>

        <section className="rounded-sm border border-stone-200 bg-white p-4 text-sm">
          <Field label="Próximo seguimiento">
            <Input type="date" defaultValue={l.next_follow_up ?? ''} onChange={(e) => run(() => updateLead(l.id, { nextFollowUp: e.target.value || null }))} />
          </Field>
          {fu === 'overdue' ? <p className="mt-1 text-xs text-red-700">Atrasado.</p> : null}
          <div className="mt-3">
            <Field label="Responsable">
              <Select defaultValue={l.assigned_to ?? ''} onChange={(e) => run(() => updateLead(l.id, { assignedTo: e.target.value || null }))}>
                <option value="">Sin asignar</option>
                {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name ?? m.email}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        <section className="rounded-sm border border-stone-200 bg-white p-4 text-sm">
          <button type="button" onClick={() => setEdit((v) => !v)} className="text-xs uppercase tracking-[0.2em] text-stone-600 underline underline-offset-4">{edit ? 'Cerrar' : 'Editar datos'}</button>
          {edit ? (
            <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await updateLead(l.id, { ...f, guestsEstimate: f.guestsEstimate ? Number(f.guestsEstimate) : null, value: f.value ? Number(f.value) : null, eventDate: f.eventDate || null, partnerB: f.partnerB || null }); if (r.ok) setEdit(false); return r; }); }}>
              <Field label="Nombre"><Input value={f.partnerA} onChange={(e) => setF({ ...f, partnerA: e.target.value })} required /></Field>
              <Field label="Pareja"><Input value={f.partnerB} onChange={(e) => setF({ ...f, partnerB: e.target.value })} /></Field>
              <Field label="Correo"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
              <Field label="Fecha del evento"><Input type="date" value={f.eventDate} onChange={(e) => setF({ ...f, eventDate: e.target.value })} /></Field>
              <Field label="Ciudad"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
              <Field label="Invitados aprox."><Input type="number" value={f.guestsEstimate} onChange={(e) => setF({ ...f, guestsEstimate: e.target.value })} /></Field>
              <Field label="Paquete que le interesa"><Select value={f.packageCode} onChange={(e) => setF({ ...f, packageCode: e.target.value })}><option value="">—</option>{packages.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</Select></Field>
              <Field label="Valor estimado"><Input type="number" min={0} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
              <Field label="Notas generales"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
              <Button type="submit" disabled={pending}>Guardar</Button>
            </form>
          ) : l.notes ? <p className="mt-2 whitespace-pre-wrap text-xs text-stone-600">{l.notes}</p> : null}
        </section>

        {isAdmin ? (
          <Button variant="danger" disabled={pending} onClick={() => { if (confirm(`¿Borrar a ${name}? Se borra todo su historial.`)) run(async () => { const r = await deleteLead(l.id); if (r.ok) window.location.href = '/admin/leads'; return r; }); }}>Borrar prospecto</Button>
        ) : null}
      </aside>
      <div className="space-y-6 md:order-1">
        {/* etapa */}
        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Etapa</p>
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STAGES.map((s) => (
              <button key={s} type="button" disabled={pending} onClick={() => { if (s !== l.stage) run(() => updateLead(l.id, { stage: s, lostReason: s === 'perdido' ? lost : undefined })); }}
                className={`rounded-full border px-3 py-1.5 text-xs ${l.stage === s ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700 hover:border-stone-500'}`}>{STAGE_LABEL[s]}</button>
            ))}
          </div>
          {(
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>Si se pierde, ¿por qué?</span>
              <Select value={lost} onChange={(e) => { setLost(e.target.value); if (l.stage === 'perdido') run(() => updateLead(l.id, { lostReason: e.target.value as (typeof LOST_REASONS)[number] })); }} className="w-auto">
                {LOST_REASONS.map((r) => <option key={r} value={r}>{LOST_REASON_LABEL[r]}</option>)}
              </Select>
            </div>
          )}
        </section>

        {/* actividad nueva */}
        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Registrar</p>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await addActivity(l.id, act); if (r.ok) setAct({ kind: 'nota', body: '', dueAt: '' }); return r; }); }}>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setAct({ ...act, kind: k })} className={`rounded-full border px-3 py-1 text-xs ${act.kind === k ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'}`}>{ACTIVITY_LABEL[k]}</button>
              ))}
            </div>
            <Textarea value={act.body} onChange={(e) => setAct({ ...act, body: e.target.value })} placeholder={act.kind === 'tarea' ? 'Qué hay que hacer (ej. mandar cotización)' : act.kind === 'llamada' ? 'Qué se habló' : 'Escribe la nota…'} className="min-h-16" />
            {act.kind === 'tarea' ? <Field label="Para cuándo" hint="Se vuelve el próximo seguimiento y aparece en Inicio ese día."><Input type="date" value={act.dueAt} onChange={(e) => setAct({ ...act, dueAt: e.target.value })} required /></Field> : null}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending}>Guardar</Button>
              {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message ?? 'Listo' : result.error}</Notice> : null}
            </div>
          </form>
        </section>

        {/* pendientes */}
        {tasks.length ? (
          <section>
            <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Pendientes</p>
            <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
              {tasks.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span>{a.body}{a.due_at ? <span className={`ml-2 text-xs ${a.due_at.slice(0, 10) < new Date().toISOString().slice(0, 10) ? 'text-red-700' : 'text-stone-500'}`}>{a.due_at.slice(0, 10)}</span> : null}</span>
                  <Button variant="secondary" disabled={pending} onClick={() => run(() => completeTask(a.id, l.id))}>Hecho</Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* historial */}
        <section>
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Historial</p>
          {l.message ? <p className="mb-3 rounded-sm border border-stone-200 bg-stone-50 p-3 text-sm italic text-stone-600">“{l.message}” <span className="not-italic text-xs text-stone-400">· mensaje inicial</span></p> : null}
          <ol className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className={`rounded-sm border border-stone-200 bg-white p-3 text-sm ${a.done_at ? 'opacity-60' : ''}`}>
                <p className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-widest text-stone-500">
                  <span>{ACTIVITY_LABEL[a.kind as ActivityKind] ?? a.kind}</span><span>· {fmt(a.created_at)}</span>{a.actor_name ? <span>· {a.actor_name}</span> : null}{a.done_at ? <span className="text-emerald-700">· hecha</span> : null}
                </p>
                {a.body ? <p className="mt-1 whitespace-pre-wrap">{a.body}</p> : null}
              </li>
            ))}
            {!activities.length ? <li className="text-sm text-stone-500">Sin actividad todavía.</li> : null}
          </ol>
        </section>
      </div>

    </div>
  );
}
