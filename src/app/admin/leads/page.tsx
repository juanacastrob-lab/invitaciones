import { requireRole } from '@/lib/auth';
import { listLeads, countUnread } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { LeadsBoard } from '@/components/admin/LeadsBoard';

export const dynamic = 'force-dynamic';

/** CRM: el pipeline de prospectos, de "nuevo" a "entregado". */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { filtro } = await searchParams;
  const [leads, unread] = await Promise.all([listLeads(), countUnread()]);
  return (
    <AdminShell me={me} title="Prospectos" current="/admin/leads" unread={unread} actions={<span className="text-xs text-stone-500">{leads.length} en total</span>}>
      <LeadsBoard leads={leads} initialFilter={filtro} />
    </AdminShell>
  );
}
