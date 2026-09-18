import { requireRole } from '@/lib/auth';
import { listPricing } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { PricingManager } from '@/components/admin/PricingManager';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const me = await requireRole('admin');
  const { packages, extras } = await listPricing();
  return (
    <AdminShell me={me} title="Precios" current="/admin/pricing">
      <PricingManager packages={packages} extras={extras} />
    </AdminShell>
  );
}
