'use client';

import { useMemo, useState, useTransition } from 'react';
import { createLeadManual } from '@/actions/crm';
import type { LeadRow } from '@/lib/admin/queries';
import { LEAD_STAGES, OPEN_STAGES, STAGE_LABEL, STAGE_TONE, SOURCES, SOURCE_LABEL, followUpState, daysSince, type LeadStage } from '@/lib/crm';
import { EVENT_TYPES, EVENT_TYPE_LABEL } from '@/lib/event-types';
import { Badge, Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import type { ActionResult } from '@/schemas/admin';

const FILTERS = [
  { key: 'abiertos', label: 'Abiertos' },
  { key: 'hoy', label: 'Seguimiento hoy' },
  { key: 'sin_seguimiento', label: 'Sin seguimiento' },
  { key: 'todos', label: 'Todos' },
  { key: 'perdidos', label: 'Perdidos' },
] as const;

function name(l: LeadRow) { return [l.partner_a, l.partner_b].filter(Boolean).join(' & '); }

function LeadCard({ l }: { l: LeadRow }) {
  const fu = followUpState(l.next_follow_up);
  const silent = daysSince(l.last_contact_at ?? l.created_at);
  return (
    <a href={`/admin/leads/${l.id}`} className="block rounded-sm border border-stone-200 bg-white p-3 hover:border-stone-400">
      <p className="text-sm font-medium">{name(l)}</p>
      <p className="mt-0.5 text-xs text-stone-500">
        {EVENT_TYPE_LABEL[l.event_type as keyof typeof EVENT_TYPE_LABEL]?.es ?? l.event_type}
        {l.event_date ? ` · ${l.event_date}` : ''}{l.city ? ` · ${l.city}` : ''}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-widest">
        {fu === 'overdue' ? <span className="text-red-700">Atrasado</span> : fu === 'today' ? <span className="text-amber-700">Hoy</span> : fu === 'upcoming' ? <span className="text-stone-500">{l.next_follow_up}</span> : <span className="text-stone-400">Sin seguimiento</span>}
        {l.source ? <span className="text-stone-400">· {SOURCE_LABEL[l.source] ?? l.source}</span> : null}
        {silent != null && silent >= 3 && OPEN_STAGES.includes(l.stage as LeadStage) ? <span className="text-stone-400">· {silent} d sin contacto</span> : null}
      </p>
    </a>
  );
}

export function LeadsBoard({ leads, initialFilter }: { leads: LeadRow[]; initialFilter?: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>((FILTERS.some((f) => f.key === initialFilter) ? initialFilter : 'abiertos') as (typeof FILTERS)[number]['key']);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (t && !`${name(l)} ${l.phone} ${l.email ?? ''} ${l.city ?? ''}`.toLowerCase().includes(t)) return false;
      switch (filter) {
        case 'abiertos': return OPEN_STAGES.includes(l.stage as LeadStage);
        case 'hoy': return OPEN_STAGES.includes(l.stage as LeadStage) && Boolean(l.next_follow_up && l.next_follow_up <= today);
        case 'sin_seguimiento': return OPEN_STAGES.includes(l.stage as LeadStage) && !l.next_follow_up;
        case 'perdidos': return l.stage === 'perdido';
        default: return true;
      }
    });
  }, [leads, filter, q, today]);

  const columns = (filter === 'perdidos' ? (['perdido'] as LeadStage[]) : filter === 'todos' ? LEAD_STAGES : OPEN_STAGES).map((s) => ({ stage: s, items: visible.filter((l) => l.stage === s) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} className={`rounded-full border px-3 py-1.5 text-xs ${filter === f.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'}`}>{f.label}</button>
        ))}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, teléfono, ciudad…" className="ml-auto w-full sm:w-64" />
        <Button type="button" onClick={() => setShowNew((v) => !v)}>{showNew ? 'Cerrar' : '+ Nuevo prospecto'}</Button>
      </div>

      {showNew ? <NewLeadForm onDone={() => setShowNew(false)} /> : null}

      {/* Celular: lista agrupada. Escritorio: columnas por etapa. */}
      <div className="space-y-6 md:hidden">
        {columns.filter((c) => c.items.length).map((c) => (
          <section key={c.stage}>
            <h2 className="mb-2 flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500"><Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABEL[c.stage]}</Badge> {c.items.length}</h2>
            <div className="space-y-2">{c.items.map((l) => <LeadCard key={l.id} l={l} />)}</div>
          </section>
        ))}
        {!visible.length ? <p className="text-sm text-stone-500">Nada con ese filtro.</p> : null}
      </div>
      <div className="hidden gap-3 overflow-x-auto pb-2 md:flex">
        {columns.map((c) => (
          <section key={c.stage} className="min-w-[11rem] flex-1 rounded-sm bg-stone-100 p-2">
            <h2 className="mb-2 flex items-center justify-between px-1 text-[0.65rem] uppercase tracking-[0.2em] text-stone-600"><span>{STAGE_LABEL[c.stage]}</span><span className="text-stone-400">{c.items.length}</span></h2>
            <div className="space-y-2">{c.items.map((l) => <LeadCard key={l.id} l={l} />)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function NewLeadForm({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult<{ id: string }> | null>(null);
  const [f, setF] = useState({ partnerA: '', partnerB: '', phone: '', email: '', country: 'MX', language: 'es', eventType: 'boda', eventDate: '', city: '', guestsEstimate: '', source: 'whatsapp', notes: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="grid gap-3 rounded-sm border border-stone-200 bg-white p-4 sm:grid-cols-2"
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createLeadManual(f); setResult(r); if (r.ok && r.data) window.location.href = `/admin/leads/${r.data.id}`; }); }}
    >
      <Field label="Nombre"><Input required value={f.partnerA} onChange={set('partnerA')} placeholder="Ana" /></Field>
      <Field label="Pareja (si aplica)"><Input value={f.partnerB} onChange={set('partnerB')} placeholder="Luis" /></Field>
      <Field label="Teléfono (WhatsApp)"><Input required value={f.phone} onChange={set('phone')} placeholder="55 1234 5678" /></Field>
      <Field label="País"><Select value={f.country} onChange={set('country')}><option value="MX">México</option><option value="US">USA</option><option value="CA">Canadá</option></Select></Field>
      <Field label="Correo (opcional)"><Input type="email" value={f.email} onChange={set('email')} /></Field>
      <Field label="Idioma"><Select value={f.language} onChange={set('language')}><option value="es">Español</option><option value="en">Inglés</option></Select></Field>
      <Field label="Tipo de evento"><Select value={f.eventType} onChange={set('eventType')}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t].es}</option>)}</Select></Field>
      <Field label="Fecha del evento"><Input type="date" value={f.eventDate} onChange={set('eventDate')} /></Field>
      <Field label="Ciudad"><Input value={f.city} onChange={set('city')} /></Field>
      <Field label="Invitados aprox."><Input type="number" min={1} value={f.guestsEstimate} onChange={set('guestsEstimate')} /></Field>
      <Field label="¿Por dónde llegó?"><Select value={f.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label="Notas"><Textarea value={f.notes} onChange={set('notes')} /></Field></div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar prospecto'}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
      </div>
    </form>
  );
}
