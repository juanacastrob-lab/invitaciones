import { requireRole } from '@/lib/auth';
import { listConversations, countUnread } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { InboxList } from '@/components/admin/InboxList';
import { whatsappConfig } from '@/lib/whatsapp/cloud';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ archivadas?: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { archivadas } = await searchParams;
  const archived = archivadas === '1';
  const [conversations, unread] = await Promise.all([listConversations(archived), countUnread()]);
  return (
    <AdminShell me={me} title="WhatsApp" current="/admin/inbox" unread={unread}>
      <InboxList conversations={conversations} connected={Boolean(whatsappConfig())} archived={archived} />
    </AdminShell>
  );
}
