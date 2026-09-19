import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { listGuests, listTables } from '@/lib/admin/queries';

/** La lista por mesa que se le da al wedding planner o al salón. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin', 'staff', 'client');
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: ev } = await supabase.from('events').select('slug').eq('id', id).maybeSingle();
  if (!ev) return new Response('Not found', { status: 404 });

  const [guests, tables] = await Promise.all([listGuests(id), listTables(id)]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: string[] = [['Mesa', 'Lugares', 'Invitado', 'Pases', 'Confirmados', 'Estado', 'Grupo', 'Teléfono'].map(esc).join(',')];

  for (const tb of tables) {
    const at = guests.filter((g) => g.table_id === tb.table_id);
    for (const g of at) rows.push([tb.name, tb.capacity ?? '', g.display_name, g.passes, g.confirmed_count, g.status, g.group_tag, g.phone].map(esc).join(','));
    rows.push([tb.name, tb.capacity ?? '', `TOTAL ${tb.name}`, at.reduce((s, g) => s + g.passes, 0), at.reduce((s, g) => s + g.confirmed_count, 0), '', '', ''].map(esc).join(','));
  }
  const sin = guests.filter((g) => !g.table_id);
  for (const g of sin) rows.push(['SIN MESA', '', g.display_name, g.passes, g.confirmed_count, g.status, g.group_tag, g.phone].map(esc).join(','));

  return new Response('﻿' + rows.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="mesas-${ev.slug}.csv"` },
  });
}
