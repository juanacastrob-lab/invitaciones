import { requireRole } from '@/lib/auth';
import { listTeam } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { TeamManager } from '@/components/admin/TeamManager';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const me = await requireRole('admin');
  const { profiles, invites } = await listTeam();
  return (
    <AdminShell me={me} title="Equipo" current="/admin/team">
      <TeamManager me={me.userId} profiles={profiles} invites={invites} />
    </AdminShell>
  );
}
