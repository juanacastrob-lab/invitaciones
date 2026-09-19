'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { archiveConversation, fetchThread, markConversationRead, reopenWithTemplate, replyWhatsapp } from '@/actions/inbox';
import type { WaConversationRow, WaMessageRow } from '@/lib/admin/queries';
import { displayPhone, withinServiceWindow } from '@/lib/whatsapp/inbox';
import { Button, Notice } from '@/components/ui';
import type { ActionResult } from '@/schemas/admin';

const time = (iso: string) => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const TICK = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '✕', received: '' } as const;

/** El hilo de una conversación. Pregunta cada 15 s si hay mensajes nuevos; nada de recargar. */
export function ChatThread({ conversation: c, initial, connected, quickReplies, live = true }: { conversation: WaConversationRow; initial: WaMessageRow[]; connected: boolean; quickReplies: { label: string; body: string }[]; live?: boolean }) {
  const [messages, setMessages] = useState<WaMessageRow[]>(initial);
  const [lastInbound, setLastInbound] = useState(c.last_inbound_at);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const open = withinServiceWindow(lastInbound);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  useEffect(() => {
    if (!live) return;
    if (c.unread) void markConversationRead(c.id);
    const id = setInterval(async () => {
      const since = messages[messages.length - 1]?.created_at ?? null;
      try {
        const r = await fetchThread(c.id, since);
        if (r.messages.length) {
          setMessages((m) => { const seen = new Set(m.map((x) => x.id)); return [...m, ...r.messages.filter((x) => !seen.has(x.id))]; });
          if (r.unread) void markConversationRead(c.id);
        }
        setLastInbound(r.lastInboundAt);
      } catch { /* sin red: se reintenta en 15 s */ }
    }, 15_000);
    return () => clearInterval(id);
  }, [c.id, c.unread, messages, live]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const r = await replyWhatsapp({ conversationId: c.id, body });
      setResult(r.ok ? null : r);
      if (r.ok) {
        setText('');
        setMessages((m) => [...m, { id: `tmp-${Date.now()}`, direction: 'out', body, media_type: null, media_id: null, status: 'sent', error: null, created_at: new Date().toISOString() }]);
      }
    });
  };

  return (
    <div className="flex min-h-[70vh] flex-col rounded-sm border border-stone-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{c.lead_name ?? c.name ?? displayPhone(c.phone)}</p>
          <p className="text-xs text-stone-500">{displayPhone(c.phone)}{c.name && c.lead_name && c.name !== c.lead_name ? ` · en WhatsApp: ${c.name}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {c.lead_id ? <a href={`/admin/leads/${c.lead_id}`} className="rounded-full border border-stone-300 px-3 py-1.5">Ver prospecto</a> : null}
          <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await archiveConversation(c.id, !c.archived_at); if (r.ok) window.location.href = '/admin/inbox'; else setResult(r); })}>{c.archived_at ? 'Desarchivar' : 'Archivar'}</Button>
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto bg-[#efe9e1] p-3">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.direction === 'out' ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
              {m.media_type === 'image' && m.media_id ? <img src={`/api/whatsapp/media/${m.media_id}`} alt="" className="mb-1 max-h-64 rounded" loading="lazy" /> : null}
              {m.media_type === 'audio' && m.media_id ? <audio controls src={`/api/whatsapp/media/${m.media_id}`} className="mb-1 max-w-full" /> : null}
              {m.media_type && !['image', 'audio'].includes(m.media_type) ? (
                m.media_id ? <a href={`/api/whatsapp/media/${m.media_id}`} target="_blank" rel="noopener noreferrer" className="mb-1 block text-xs underline">📎 {m.media_type}</a> : <span className="mb-1 block text-xs text-stone-500">[{m.media_type}]</span>
              ) : null}
              {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
              <p className={`mt-1 text-right text-[0.6rem] ${m.status === 'failed' ? 'text-red-700' : m.status === 'read' ? 'text-sky-600' : 'text-stone-400'}`}>
                {time(m.created_at)} {m.direction === 'out' ? TICK[m.status as keyof typeof TICK] ?? '' : ''}{m.status === 'failed' && m.error ? ` · ${m.error}` : ''}
              </p>
            </div>
          </li>
        ))}
        <div ref={bottom} />
      </ol>

      <footer className="border-t border-stone-200 p-3">
        {!open ? (
          <div className="mb-2 rounded-sm bg-amber-50 p-2 text-xs text-amber-900">
            Pasaron más de 24 h desde su último mensaje. Meta solo deja mandar una plantilla aprobada; cuando conteste, se abre otra vez.
            <Button variant="secondary" className="ml-2" disabled={pending || !connected} onClick={() => start(async () => setResult(await reopenWithTemplate(c.id)))}>Reabrir con plantilla</Button>
          </div>
        ) : null}
        {quickReplies.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickReplies.map((q) => <button key={q.label} type="button" onClick={() => setText(q.body)} className="rounded-full border border-stone-300 px-2.5 py-1 text-[0.7rem] text-stone-700">{q.label}</button>)}
          </div>
        ) : null}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={connected ? (open ? 'Escribe un mensaje… (Enter para enviar)' : 'Ventana cerrada: usa la plantilla') : 'WhatsApp no conectado todavía'}
            disabled={!connected || !open || pending}
            className="min-h-11 flex-1 resize-y rounded-sm border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-50"
            rows={1}
          />
          <Button type="submit" disabled={!connected || !open || pending || !text.trim()}>{pending ? '…' : 'Enviar'}</Button>
        </form>
        {result && !result.ok ? <div className="mt-2"><Notice kind="error">{result.error}</Notice></div> : null}
        {result?.ok && result.message ? <div className="mt-2"><Notice kind="ok">{result.message}</Notice></div> : null}
      </footer>
    </div>
  );
}
