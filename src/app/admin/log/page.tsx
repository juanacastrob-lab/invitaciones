import { requireRole } from '@/lib/auth';
import { listActivity } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  create: 'creó', update_basics: 'editó datos de', update_content: 'editó el contenido de', status: 'cambió el estado de', approved: 'aprobó',
  duplicate: 'duplicó', paid: 'marcó pagado', role: 'cambió el rol de', update: 'actualizó', import: 'importó invitados a', delete: 'borró',
};
const ENTITY_LABEL: Record<string, string> = { event: 'el evento', order: 'el pedido', profile: 'el perfil', package: 'el paquete', extra: 'el extra', guest: 'el invitado', lead: 'el prospecto' };

export default async function LogPage() {
  const me = await requireRole('admin', 'staff');
  const rows = await listActivity();
  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
  return (
    <AdminShell me={me} title="Bitácora" current="/admin/log">
      <p className="mb-4 text-xs text-stone-500">Quién hizo qué y cuándo. Últimos 200 movimientos.</p>
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3">
            <div>
              <span className="font-medium">{r.actor_label}</span>{' '}
              {ACTION_LABEL[r.action] ?? r.action}{' '}
              {r.entity === 'event' && r.entity_label ? <a className="underline" href={`/admin/events/${r.entity_id}`}>{r.entity_label}</a> : <span>{ENTITY_LABEL[r.entity] ?? r.entity}{r.entity_label ? ` ${r.entity_label}` : ''}</span>}
              {r.detail ? <span className="text-stone-500"> · {r.detail}</span> : null}
            </div>
            <time className="text-xs text-stone-400">{fmt.format(new Date(r.created_at))}</time>
          </li>
        ))}
        {!rows.length ? <li className="p-6 text-center text-stone-500">Todavía no hay movimientos.</li> : null}
      </ul>
    </AdminShell>
  );
}
