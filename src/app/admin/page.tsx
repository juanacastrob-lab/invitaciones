import { requireRole } from '@/lib/auth';
import { getDashboard } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { Dashboard } from '@/components/admin/Dashboard';

export const dynamic = 'force-dynamic';

/** Inicio del admin: el tablero del negocio. */
export default async function AdminHome() {
  const me = await requireRole('admin', 'staff');
  const d = await getDashboard();
  return (
    <AdminShell me={me} title="Inicio" current="/admin" unread={d.unread}>
      <Dashboard d={d} />
    </AdminShell>
  );
}
