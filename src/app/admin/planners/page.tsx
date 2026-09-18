import { requireRole } from '@/lib/auth';
import { listPlanners } from '@/lib/admin/queries';
import { getSiteUrl } from '@/lib/env';
import { AdminShell } from '@/components/admin/AdminShell';
import { PlannersManager } from '@/components/admin/PlannersManager';

export const dynamic = 'force-dynamic';

export default async function PlannersPage() {
  const me = await requireRole('admin');
  const { planners, orders } = await listPlanners();
  return (
    <AdminShell me={me} title="Wedding planners" current="/admin/planners">
      <PlannersManager planners={planners} orders={orders} siteUrl={getSiteUrl() ?? ''} />
    </AdminShell>
  );
}
