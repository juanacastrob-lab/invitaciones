import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getLead, listTeamMembers, countUnread, listPricing } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { LeadDetail } from '@/components/admin/LeadDetail';
import { LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [data, team, unread, pricing] = await Promise.all([getLead(id), listTeamMembers(), countUnread(), listPricing()]);
  if (!data) notFound();
  const name = [data.lead.partner_a, data.lead.partner_b].filter(Boolean).join(' & ');
  return (
    <AdminShell me={me} title={name} current="/admin/leads" unread={unread} actions={<LinkButton href="/admin/leads">← Prospectos</LinkButton>}>
      <LeadDetail lead={data.lead} activities={data.activities} team={team} conversationId={data.conversationId} isAdmin={me.role === 'admin'} packages={pricing.packages.filter((p) => p.active).map((p) => ({ code: p.code, name: `${p.name} (${p.country})` }))} />
    </AdminShell>
  );
}
