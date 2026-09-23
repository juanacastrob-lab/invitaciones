import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { FunnelView } from '@/components/admin/FunnelView';
import { summarizeFunnel, type FunnelRow } from '@/lib/funnel';
import { countUnread } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { dias } = await searchParams;
  const days = [7, 14, 30, 90].includes(Number(dias)) ? Number(dias) : 7;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = await supabaseServer();
  const [{ data }, unread] = await Promise.all([
    supabase.from('funnel_events').select('session_id, step, utm_source, utm_campaign, region, event_type, package_code, created_at').gte('created_at', since).order('created_at').limit(50000),
    countUnread(),
  ]);
  return (
    <AdminShell me={me} title="Embudo" current="/admin/funnel" unread={unread}>
      <FunnelView data={summarizeFunnel((data ?? []) as FunnelRow[])} days={days} />
    </AdminShell>
  );
}
