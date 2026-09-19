import { Badge } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE, type EventStatus } from '@/lib/admin/labels';
import { LEAD_STAGES, STAGE_LABEL, STAGE_TONE, SOURCE_LABEL, followUpState, type LeadStage } from '@/lib/crm';
import type { DashboardData } from '@/lib/admin/queries';

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** El tablero del negocio: qué toca hoy y cómo va el mes. Puro servidor, sin JS. */
export function Dashboard({ d }: { d: DashboardData }) {
  const tiles: { label: string; value: string; href: string; tone?: 'red' | 'amber' }[] = [
    { label: 'Seguimientos para hoy', value: String(d.followUpsDue.length), href: '/admin/leads?filtro=hoy', tone: d.followUpsDue.length ? 'amber' : undefined },
    { label: 'WhatsApp sin leer', value: String(d.unread), href: '/admin/inbox', tone: d.unread ? 'red' : undefined },
    { label: 'Prospectos nuevos (7 días)', value: String(d.leadsNew7d), href: '/admin/leads' },
    { label: 'Prospectos abiertos', value: String(d.leadsOpen), href: '/admin/leads' },
    { label: 'Ventas del mes', value: money(d.revenueMonth), href: '/admin/orders' },
    { label: 'Pedidos pagados (mes)', value: String(d.ordersPaidMonth), href: '/admin/orders' },
    { label: 'Pagos por confirmar', value: String(d.ordersPending), href: '/admin/orders', tone: d.ordersPending ? 'amber' : undefined },
    { label: 'Express por entregar', value: String(d.expressPending), href: '/admin/orders', tone: d.expressPending ? 'red' : undefined },
  ];
  const maxRev = Math.max(1, ...d.revenueByMonth.map((r) => r.total));
  const stages = LEAD_STAGES.filter((s) => d.leadsByStage[s]);
  const totalLeads = Object.values(d.leadsByStage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className={`rounded-sm border bg-white p-4 ${t.tone === 'red' ? 'border-red-200' : t.tone === 'amber' ? 'border-amber-200' : 'border-stone-200'}`}>
            <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t.label}</dt>
            <dd className={`mt-1 font-serif text-3xl ${t.tone === 'red' ? 'text-red-700' : t.tone === 'amber' ? 'text-amber-700' : ''}`}>{t.value}</dd>
          </a>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Qué toca hoy</h2>
        {!d.followUpsDue.length ? (
          <p className="rounded-sm border border-stone-200 bg-white p-4 text-sm text-stone-500">Nada pendiente. Los seguimientos con fecha aparecen aquí el día que tocan.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
            {d.followUpsDue.map((l) => {
              const st = followUpState(l.next_follow_up);
              return (
                <li key={l.id}>
                  <a href={`/admin/leads/${l.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-stone-50">
                    <span className="text-sm font-medium">{[l.partner_a, l.partner_b].filter(Boolean).join(' & ')}</span>
                    <span className="flex items-center gap-2 text-xs">
                      <Badge tone={STAGE_TONE[l.stage as LeadStage] ?? 'neutral'}>{STAGE_LABEL[l.stage as LeadStage] ?? l.stage}</Badge>
                      <span className={st === 'overdue' ? 'text-red-700' : 'text-amber-700'}>{st === 'overdue' ? `atrasado · ${l.next_follow_up}` : 'hoy'}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Ventas por mes</h2>
          {!d.revenueByMonth.length ? <p className="text-sm text-stone-500">Todavía no hay pedidos pagados.</p> : (
            <ul className="space-y-2">
              {d.revenueByMonth.map((r) => (
                <li key={r.month} className="flex items-center gap-3 text-xs">
                  <span className="w-14 shrink-0 text-stone-500">{MONTHS[Number(r.month.slice(5, 7)) - 1]} {r.month.slice(2, 4)}</span>
                  <span className="h-3 rounded-sm bg-stone-800" style={{ width: `${Math.max(2, (r.total / maxRev) * 100)}%` }} />
                  <span className="tabular-nums">{money(r.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Embudo de prospectos</h2>
          {!totalLeads ? <p className="text-sm text-stone-500">Todavía no hay prospectos.</p> : (
            <ul className="space-y-2">
              {stages.map((s) => (
                <li key={s} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-stone-500">{STAGE_LABEL[s]}</span>
                  <span className={`h-3 rounded-sm ${s === 'perdido' ? 'bg-red-300' : s === 'entregado' ? 'bg-stone-300' : 'bg-stone-800'}`} style={{ width: `${Math.max(2, (d.leadsByStage[s] / totalLeads) * 100)}%` }} />
                  <span className="tabular-nums">{d.leadsByStage[s]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">De dónde llegan</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {Object.entries(d.leadsBySource).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <li key={s} className="rounded-full border border-stone-200 px-3 py-1">{SOURCE_LABEL[s] ?? s} · {n}</li>
            ))}
            {!Object.keys(d.leadsBySource).length ? <li className="text-stone-500">Sin datos todavía.</li> : null}
          </ul>
        </section>

        <section className="rounded-sm border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Eventos</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(STATUS_LABEL) as EventStatus[]).filter((s) => d.eventsByStatus[s]).map((s) => (
              <li key={s}><a href="/admin/events"><Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]} · {d.eventsByStatus[s]}</Badge></a></li>
            ))}
            {!Object.keys(d.eventsByStatus).length ? <li className="text-stone-500">Sin eventos todavía.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
