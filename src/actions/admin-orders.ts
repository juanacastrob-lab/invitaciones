'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { provisionOrder } from '@/actions/order';
import type { ActionResult } from '@/schemas/admin';

/** Transferencia recibida: marca pagado y deja el evento y los accesos listos. */
export async function markOrderPaid(orderId: string, reference: string): Promise<ActionResult<{ eventId: string | null }>> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('rpc_mark_order_paid', { p_order_id: orderId, p_reference: reference });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, error: r.error === 'not_found' ? 'Pedido no encontrado.' : 'No se pudo marcar.' };

  const prov = await provisionOrder(orderId);
  revalidatePath('/admin/orders');
  return { ok: true, data: { eventId: prov?.eventId ?? null }, message: prov ? 'Pagado. Evento creado en borrador.' : 'Pagado.' };
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', orderId).eq('status', 'pendiente');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/orders');
  return { ok: true };
}
