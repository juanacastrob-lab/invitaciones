import { notFound } from 'next/navigation';
import { TeamManager } from '@/components/admin/TeamManager';
import { PricingManager } from '@/components/admin/PricingManager';

export const dynamic = 'force-dynamic';

/** Equipo y precios con datos de mentira, para revisar el diseño. No existe en producción. */
export default function DevTeam() {
  if (process.env.NODE_ENV === 'production') notFound();
  const profiles = [
    { user_id: 'a', email: 'juan@ejemplo.com', name: 'Juan', role: 'admin' as const, created_at: '2026-09-01' },
    { user_id: 'b', email: 'administrativa@ejemplo.com', name: null, role: 'staff' as const, created_at: '2026-09-10' },
    { user_id: 'c', email: 'ana@ejemplo.com', name: 'Ana & Luis', role: 'client' as const, created_at: '2026-09-12' },
  ];
  const invites = [{ id: '11111111-1111-1111-1111-111111111111', email: 'nueva@ejemplo.com', accepted_at: null, created_at: '2026-09-15' }];
  const packages = [
    { id: 'p1', code: 'basico', name: 'Básico', country: 'MX', currency: 'MXN', price: 1399, active: true, features: ['pdf'] },
    { id: 'p2', code: 'esencial', name: 'Esencial', country: 'MX', currency: 'MXN', price: 2800, active: true, features: ['web', 'rsvp'] },
  ];
  const extras = [{ id: 'e1', code: 'musica', name: 'Música de fondo', description: 'Tu canción en la invitación.', country: 'MX', currency: 'MXN', price: 300, active: true, included_in: ['completo', 'premium'] }];
  return (
    <main className="mx-auto max-w-3xl space-y-10 bg-stone-50 px-4 py-8">
      <TeamManager me="a" profiles={profiles} invites={invites} />
      <PricingManager packages={packages} extras={extras} />
    </main>
  );
}
