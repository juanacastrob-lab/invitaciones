import { FUNNEL_LABEL, type summarizeFunnel } from '@/lib/funnel';
import { EVENT_TYPE_LABEL, type EventType } from '@/lib/event-types';

/** El embudo de la tienda: cuántas sesiones llegan a cada paso y dónde se caen. Puro servidor. */
export function FunnelView({ data, days }: { data: ReturnType<typeof summarizeFunnel>; days: number }) {
  const max = Math.max(1, ...data.steps.map((s) => s.sessions));
  const worst = data.steps.slice(1).reduce<{ step: string; keptPct: number } | null>((w, s) => (s.keptPct !== null && (w === null || s.keptPct < w.keptPct) ? { step: s.step, keptPct: s.keptPct } : w), null);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 text-xs">
        {[7, 14, 30, 90].map((d) => <a key={d} href={`/admin/funnel?dias=${d}`} className={`rounded-full border px-3 py-1.5 ${d === days ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'}`}>Últimos {d} días</a>)}
      </div>

      <section className="rounded-sm border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Paso a paso</h2>
        <p className="mb-4 text-xs text-stone-500">Sesiones únicas (un navegador = una sesión). El porcentaje es cuántas siguieron desde el paso anterior.</p>
        {!data.steps[0].sessions && !data.steps[1].sessions ? <p className="text-sm text-stone-500">Todavía no hay visitas registradas.</p> : (
          <ol className="space-y-2">
            {data.steps.map((s) => (
              <li key={s.step} className="grid grid-cols-[7.5rem_1fr_2.5rem_3rem] items-center gap-2 text-xs sm:grid-cols-[13rem_1fr_3.5rem_4rem] sm:gap-3">
                <span className="truncate text-stone-700">{FUNNEL_LABEL[s.step]}</span>
                <span className="h-4 rounded-sm bg-stone-100"><span className="block h-4 rounded-sm bg-stone-800" style={{ width: `${(s.sessions / max) * 100}%` }} /></span>
                <span className="text-right tabular-nums">{s.sessions}</span>
                <span className={`text-right tabular-nums ${s.keptPct !== null && s.keptPct < 40 ? 'text-red-700' : 'text-stone-500'}`}>{s.keptPct === null ? '' : `${s.keptPct}%`}</span>
              </li>
            ))}
          </ol>
        )}
        {worst ? <p className="mt-4 rounded-sm bg-amber-50 p-3 text-xs text-amber-900">Donde más se pierde gente: <strong>{FUNNEL_LABEL[worst.step as keyof typeof FUNNEL_LABEL]}</strong> (solo sigue el {worst.keptPct}%).</p> : null}
      </section>

      <section className="rounded-sm border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Por campaña</h2>
        <p className="mb-4 text-xs text-stone-500">La campaña es la del primer clic (utm_source · utm_campaign del anuncio). "directo" = sin anuncio.</p>
        {!data.campaigns.length ? <p className="text-sm text-stone-500">Sin datos.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[0.65rem] uppercase tracking-widest text-stone-500"><th className="py-2 pr-3">Campaña</th><th className="py-2 pr-3 text-right">Portada</th><th className="py-2 pr-3 text-right">Tienda</th><th className="py-2 pr-3 text-right">Vio invitación</th><th className="py-2 pr-3 text-right">Llegó al pago</th><th className="py-2 pr-3 text-right">Pagó</th><th className="py-2 text-right">Conversión</th></tr></thead>
              <tbody>
                {data.campaigns.map((c) => {
                  const base = Math.max(c.landing, c.store);
                  return (
                    <tr key={c.name} className="border-t border-stone-100">
                      <td className="py-2 pr-3">{c.name}</td><td className="py-2 pr-3 text-right tabular-nums">{c.landing}</td><td className="py-2 pr-3 text-right tabular-nums">{c.store}</td><td className="py-2 pr-3 text-right tabular-nums">{c.preview}</td><td className="py-2 pr-3 text-right tabular-nums">{c.payment}</td><td className="py-2 pr-3 text-right tabular-nums font-medium">{c.paid}</td>
                      <td className="py-2 text-right tabular-nums">{base ? `${((c.paid / base) * 100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-sm border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Qué celebran los que entran</h2>
        <ul className="flex flex-wrap gap-2 text-xs">
          {data.byType.map(([type, n]) => <li key={type} className="rounded-full border border-stone-200 px-3 py-1">{EVENT_TYPE_LABEL[type as EventType]?.es ?? type} · {n}</li>)}
          {!data.byType.length ? <li className="text-stone-500">Sin datos.</li> : null}
        </ul>
      </section>
    </div>
  );
}
