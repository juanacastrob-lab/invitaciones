import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getConversation, listConversations, countUnread } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { InboxList } from '@/components/admin/InboxList';
import { ChatThread } from '@/components/admin/ChatThread';
import { whatsappConfig } from '@/lib/whatsapp/cloud';
import { QUICK_REPLIES } from '@/lib/whatsapp/quick-replies';
import { LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

/** Escritorio: lista a la izquierda y chat a la derecha. Celular: solo el chat, con botón para volver. */
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [data, conversations, unread] = await Promise.all([getConversation(id), listConversations(false), countUnread()]);
  if (!data) notFound();
  const connected = Boolean(whatsappConfig());
  return (
    <AdminShell me={me} title="WhatsApp" current="/admin/inbox" unread={unread} actions={<LinkButton href="/admin/inbox">← Bandeja</LinkButton>}>
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <div className="hidden md:block"><InboxList conversations={conversations} current={id} connected={connected} archived={false} /></div>
        <ChatThread conversation={data.conversation} initial={data.messages} connected={connected} quickReplies={QUICK_REPLIES} />
      </div>
    </AdminShell>
  );
}
