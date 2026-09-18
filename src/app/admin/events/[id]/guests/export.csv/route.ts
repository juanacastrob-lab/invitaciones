import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { listGuests } from '@/lib/admin/queries';
import { GUEST_STATUS_LABEL } from '@/lib/admin/labels';

/** Exporta la lista con estado y confirmación. Se abre en Excel directo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin', 'staff', 'client');
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: ev } = await supabase.from('events').select('slug').eq('id', id).maybeSingle();
  if (!ev) return new Response('Not found', { status: 404 });

  const guests = await listGuests(id);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Nombre', 'Pases', 'Estado', 'Confirmados', 'Teléfono', 'Correo', 'Idioma', 'Grupo', 'Mesa', 'Enviado', 'Abrió', 'Respondió'];
  const lines = guests.map((g) =>
    [g.display_name, g.passes, GUEST_STATUS_LABEL[g.status], g.confirmed_count, g.phone, g.email, g.language, g.group_tag, g.table_no, g.sent_at ? 'sí' : '', g.opened_at ? 'sí' : '', g.responded_at ?? ''].map(esc).join(','),
  );
  // BOM para que Excel en Windows abra los acentos bien.
  const csv = '﻿' + [head.map(esc).join(','), ...lines].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invitados-${ev.slug}.csv"`,
    },
  });
}
