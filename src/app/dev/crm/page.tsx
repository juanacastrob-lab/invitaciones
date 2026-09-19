import { notFound } from 'next/navigation';
import { LeadsBoard } from '@/components/admin/LeadsBoard';
import { LeadDetail } from '@/components/admin/LeadDetail';
import { Dashboard } from '@/components/admin/Dashboard';
import type { LeadRow } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

const base = { email: null, country: 'MX', language: 'es', event_type: 'boda', city: 'CDMX', guests_estimate: 120, package_code: null, message: null, source: 'landing', utm_source: null, utm_campaign: null, notes: null, assigned_to: null, value: null, currency: 'MXN', lost_reason: null, order_id: null, updated_at: '2026-09-18T10:00:00Z' };
const today = new Date().toISOString().slice(0, 10);
const leads: LeadRow[] = [
  { ...base, id: 'l1', partner_a: 'Ana', partner_b: 'Luis', phone: '+525512345678', event_date: '2027-03-13', stage: 'nuevo', next_follow_up: today, last_contact_at: null, created_at: '2026-09-18T10:00:00Z', message: 'Queremos algo sencillo para 120 personas', source: 'whatsapp' },
  { ...base, id: 'l2', partner_a: 'Sofía Valentina', partner_b: null, phone: '+525598765432', event_type: 'xv', event_date: '2026-11-20', stage: 'cotizado', next_follow_up: '2026-09-10', last_contact_at: '2026-09-09T10:00:00Z', created_at: '2026-09-01T10:00:00Z', value: 4800, source: 'instagram' },
  { ...base, id: 'l3', partner_a: 'María', partner_b: 'José', phone: '+525511112222', event_date: '2027-01-10', stage: 'contactado', next_follow_up: null, last_contact_at: '2026-09-15T10:00:00Z', created_at: '2026-09-12T10:00:00Z' },
  { ...base, id: 'l4', partner_a: 'Karla', partner_b: 'Dan', phone: '+15551234567', country: 'US', currency: 'USD', event_date: '2027-06-05', stage: 'en_produccion', next_follow_up: null, last_contact_at: '2026-09-17T10:00:00Z', created_at: '2026-08-20T10:00:00Z', value: 5900, source: 'planner' },
  { ...base, id: 'l5', partner_a: 'Pau', partner_b: 'Ricardo', phone: '+525533334444', event_date: '2026-12-12', stage: 'perdido', lost_reason: 'precio', next_follow_up: null, last_contact_at: null, created_at: '2026-08-01T10:00:00Z' },
];

/** CRM con datos de mentira, para revisar el diseño sin base. No existe en producción. */
export default async function DevCrm({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { vista } = await searchParams;
  if (vista === 'ficha') {
    return (
      <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6">
        <LeadDetail lead={leads[1]} team={[{ user_id: 'u1', name: 'Juan', email: null }, { user_id: 'u2', name: 'Administrativa', email: null }]} conversationId="c1" isAdmin packages={[{ code: 'express', name: 'Express' }, { code: 'completo', name: 'Completo' }]}
          activities={[
            { id: 'a1', lead_id: 'l2', actor: 'u2', actor_name: 'Administrativa', kind: 'tarea', body: 'Mandar cotización del paquete Completo', due_at: '2026-09-10T15:00:00Z', done_at: null, created_at: '2026-09-09T10:00:00Z' },
            { id: 'a2', lead_id: 'l2', actor: 'u2', actor_name: 'Administrativa', kind: 'whatsapp', body: 'Le mandé la demo, dice que la ve con su mamá', due_at: null, done_at: null, created_at: '2026-09-09T09:00:00Z' },
            { id: 'a3', lead_id: 'l2', actor: null, actor_name: null, kind: 'etapa', body: 'nuevo → contactado', due_at: null, done_at: null, created_at: '2026-09-02T09:00:00Z' },
          ]} />
      </main>
    );
  }
  if (vista === 'inicio') {
    return (
      <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6">
        <Dashboard d={{ leadsNew7d: 3, leadsOpen: 4, followUpsDue: [leads[0], leads[1]], unread: 2, ordersPaidMonth: 6, revenueMonth: 21400, ordersPending: 1, expressPending: 1, eventsByStatus: { borrador: 2, en_revision: 1, publicado: 4 }, revenueByMonth: [{ month: '2026-06', total: 9800 }, { month: '2026-07', total: 15600 }, { month: '2026-08', total: 12300 }, { month: '2026-09', total: 21400 }], leadsByStage: { nuevo: 1, contactado: 1, cotizado: 1, en_produccion: 1, perdido: 1 }, leadsBySource: { landing: 2, whatsapp: 1, instagram: 1, planner: 1 } }} />
      </main>
    );
  }
  return <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6"><LeadsBoard leads={leads} /></main>;
}
