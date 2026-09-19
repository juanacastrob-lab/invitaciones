import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

/** El cascarón del admin con un usuario de mentira, para revisar la barra en celular. No existe en producción. */
export default function DevAdmin() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell me={{ userId: 'x', email: 'admin@ejemplo.com', name: 'Juan', role: 'admin' }} title="Eventos" current="/admin/events">
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {['Juan Antonio & Ana Marcela', 'Sofía Valentina', 'Familia Pérez'].map((n) => <li key={n} className="p-4"><p className="font-medium">{n}</p><p className="text-xs text-stone-500">boda · /i/demo · 2027-03-13</p></li>)}
      </ul>
    </AdminShell>
  );
}
