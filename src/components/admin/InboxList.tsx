import { Badge } from '@/components/ui';
import { STAGE_LABEL, STAGE_TONE, type LeadStage } from '@/lib/crm';
import { displayPhone, withinServiceWindow } from '@/lib/whatsapp/inbox';
import type { WaConversationRow } from '@/lib/admin/queries';

const when = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', ...(sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }) });
};

/** Lista de conversaciones, como en el celular: las que tienen algo sin leer van arriba. */
export function InboxList({ conversations, current, connected, archived }: { conversations: WaConversationRow[]; current?: string; connected: boolean; archived: boolean }) {
  const sorted = [...conversations].sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.last_message_at.localeCompare(a.last_message_at));
  return (
    <div>
      {!connected ? (
        <p className="mb-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          WhatsApp todavía no está conectado. Cuando estén las variables WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_APP_SECRET y WHATSAPP_VERIFY_TOKEN en Netlify y el webhook apuntando a <code>/api/whatsapp/webhook</code>, los mensajes empiezan a entrar aquí.
        </p>
      ) : null}
      <div className="mb-3 flex gap-3 text-xs">
        <a href="/admin/inbox" className={!archived ? 'font-medium text-stone-900 underline underline-offset-4' : 'text-stone-500'}>Activas</a>
        <a href="/admin/inbox?archivadas=1" className={archived ? 'font-medium text-stone-900 underline underline-offset-4' : 'text-stone-500'}>Archivadas</a>
      </div>
      {!sorted.length ? <p className="rounded-sm border border-stone-200 bg-white p-4 text-sm text-stone-500">{archived ? 'Nada archivado.' : 'Todavía no hay conversaciones. Cuando alguien escriba al WhatsApp del negocio, aparece aquí.'}</p> : (
        <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
          {sorted.map((c) => {
            const open = withinServiceWindow(c.last_inbound_at);
            return (
              <li key={c.id}>
                <a href={`/admin/inbox/${c.id}`} className={`flex items-center gap-3 p-3 hover:bg-stone-50 ${current === c.id ? 'bg-stone-100' : ''}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${c.unread ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'}`}>{(c.lead_name ?? c.name ?? '#')[0]?.toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-semibold' : ''}`}>{c.lead_name ?? c.name ?? displayPhone(c.phone)}</span>
                      <span className="shrink-0 text-[0.65rem] text-stone-400">{when(c.last_message_at)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-stone-500">{c.last_body ?? '—'}</span>
                      {c.unread ? <span className="shrink-0 rounded-full bg-red-600 px-1.5 text-[0.6rem] text-white">{c.unread}</span> : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[0.6rem] uppercase tracking-widest text-stone-400">
                      {c.lead_stage ? <Badge tone={STAGE_TONE[c.lead_stage as LeadStage] ?? 'neutral'}>{STAGE_LABEL[c.lead_stage as LeadStage] ?? c.lead_stage}</Badge> : null}
                      {!open ? <span>ventana cerrada</span> : null}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
