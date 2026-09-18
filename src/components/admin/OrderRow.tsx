'use client';

import { useState, useTransition } from 'react';
import { markOrderPaid, cancelOrder } from '@/actions/admin-orders';
import type { ActionResult } from '@/schemas/admin';
import { Badge, Button, Input, Notice } from '@/components/ui';
import { whatsappLink } from '@/lib/config';

interface Order {
  id: string; number: number; status: 'pendiente' | 'pagado' | 'cancelado'; package_name: string;
  extras: { name: string; price: number }[]; total: number; currency: string; build_mode: string; planner_email: string | null;
  commission_amount?: number | null; commission_paid_at?: string | null;
  payment_method: string; contact: { partner_a: string; partner_b: string | null; email: string; phone: string }; event_id: string | null; paid_at: string | null; created_at: string;
}

const MODE = { team: 'Lo arma el equipo', self: 'Lo arman ellos', planner: 'Wedding planner' } as const;

export function OrderRow({ order: o }: { order: Order }) {
  const [pending, start] = useTransition();
  const [ref, setRef] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: o.currency, maximumFractionDigits: 0 });

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">#{o.number} · {o.contact.partner_a}{o.contact.partner_b ? ` & ${o.contact.partner_b}` : ''}
            <span className="ml-2"><Badge tone={o.status === 'pagado' ? 'green' : o.status === 'pendiente' ? 'amber' : 'neutral'}>{o.status}</Badge></span>
          </p>
          <p className="mt-0.5 text-sm text-stone-600">{o.package_name}{o.extras.length ? ` + ${o.extras.map((e) => e.name).join(', ')}` : ''} · <strong>{fmt.format(Number(o.total))}</strong> · {o.payment_method === 'transfer' ? 'transferencia' : 'tarjeta (simulada)'}</p>
          <p className="mt-0.5 text-xs text-stone-500">{MODE[o.build_mode as keyof typeof MODE] ?? o.build_mode}{o.planner_email ? ` (${o.planner_email})` : ''}{Number(o.commission_amount) > 0 ? ` · comisión ${fmt.format(Number(o.commission_amount))}${o.commission_paid_at ? ' pagada' : ''}` : ''} · {new Date(o.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
          <p className="mt-1 flex gap-3 text-xs">
            <a className="underline" href={whatsappLink(`Hola ${o.contact.partner_a}, soy de Hola Boda, sobre tu pedido #${o.number} 🙂`, o.contact.phone)} target="_blank" rel="noopener noreferrer">WhatsApp {o.contact.phone}</a>
            <a className="underline" href={`mailto:${o.contact.email}`}>{o.contact.email}</a>
            {o.event_id ? <a className="underline" href={`/admin/events/${o.event_id}`}>Ver evento</a> : null}
          </p>
        </div>
        {o.status === 'pendiente' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Folio / referencia" className="w-40" />
            <Button disabled={pending} onClick={() => start(async () => setResult(await markOrderPaid(o.id, ref)))}>Marcar pagado</Button>
            <Button variant="danger" disabled={pending} onClick={() => { if (confirm(`¿Cancelar el pedido #${o.number}?`)) start(async () => setResult(await cancelOrder(o.id))); }}>Cancelar</Button>
          </div>
        ) : null}
      </div>
      {result ? <div className="mt-2"><Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice></div> : null}
    </li>
  );
}
