import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { OrderRow } from '@/components/admin/OrderRow';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const me = await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, status, package_name, extras, total, currency, build_mode, planner_email, payment_method, contact, event_id, paid_at, created_at, commission_amount, commission_paid_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <AdminShell me={me} title="Pedidos" current="/admin/orders">
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {(orders ?? []).map((o) => <OrderRow key={o.id} order={o as Parameters<typeof OrderRow>[0]['order']} />)}
        {!orders?.length ? <li className="p-6 text-center text-sm text-stone-500">Todavía no hay pedidos.</li> : null}
      </ul>
    </AdminShell>
  );
}
