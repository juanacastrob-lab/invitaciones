import { notFound } from 'next/navigation';
import { InboxList } from '@/components/admin/InboxList';
import { ChatThread } from '@/components/admin/ChatThread';
import { QUICK_REPLIES } from '@/lib/whatsapp/quick-replies';
import type { WaConversationRow, WaMessageRow } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
const convs: WaConversationRow[] = [
  { id: 'c1', phone: '5215512345678', name: 'Sofi ✨', lead_id: 'l2', assigned_to: null, last_message_at: iso(3), last_inbound_at: iso(3), unread: 2, archived_at: null, lead_name: 'Sofía Valentina', lead_stage: 'cotizado', last_body: '¿Me mandas el precio del completo?' },
  { id: 'c2', phone: '5215598765432', name: 'Ana', lead_id: 'l1', assigned_to: null, last_message_at: iso(600), last_inbound_at: iso(600), unread: 0, archived_at: null, lead_name: 'Ana & Luis', lead_stage: 'nuevo', last_body: 'Gracias, lo vemos y te decimos' },
  { id: 'c3', phone: '15551234567', name: null, lead_id: null, assigned_to: null, last_message_at: iso(3000), last_inbound_at: iso(3000), unread: 0, archived_at: null, lead_name: null, lead_stage: null, last_body: '[image]' },
];
const messages: WaMessageRow[] = [
  { id: 'm1', direction: 'in', body: 'Hola! Vi su anuncio en Instagram, quiero info para mis XV', media_type: null, media_id: null, status: 'received', error: null, created_at: iso(60) },
  { id: 'm2', direction: 'out', body: '¡Hola Sofi! Claro 🙂 ¿Para qué fecha es y cuántos invitados más o menos?', media_type: null, media_id: null, status: 'read', error: null, created_at: iso(55) },
  { id: 'm3', direction: 'in', body: '20 de noviembre, como 150 personas', media_type: null, media_id: null, status: 'received', error: null, created_at: iso(50) },
  { id: 'm4', direction: 'out', body: 'Perfecto. Mira una de muestra: https://holaboda.mx/i/juan-y-ana', media_type: null, media_id: null, status: 'delivered', error: null, created_at: iso(40) },
  { id: 'm5', direction: 'in', body: '¿Me mandas el precio del completo?', media_type: null, media_id: null, status: 'received', error: null, created_at: iso(3) },
  { id: 'm6', direction: 'out', body: 'mensaje que falló', media_type: null, media_id: null, status: 'failed', error: 'Fuera de la ventana de 24 h', created_at: iso(2) },
];

/** Bandeja con datos de mentira. No existe en producción. */
export default async function DevInbox({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { vista } = await searchParams;
  if (vista === 'lista') return <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6"><InboxList conversations={convs} connected={false} archived={false} /></main>;
  return (
    <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6">
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <div className="hidden md:block"><InboxList conversations={convs} current="c1" connected archived={false} /></div>
        <ChatThread conversation={convs[0]} initial={messages} connected quickReplies={QUICK_REPLIES} live={false} />
      </div>
    </main>
  );
}
