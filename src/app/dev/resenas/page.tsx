import { notFound } from 'next/navigation';
import { Reviews } from '@/components/landing/Reviews';
import { ReviewBox } from '@/components/panel/ReviewBox';
import { ReviewsManager } from '@/components/admin/ReviewsManager';

export const dynamic = 'force-dynamic';

const R = [
  { id: '1', author_name: 'Ana y Luis', rating: 5, body: 'Quedó preciosa y mis invitados confirmaron rapidísimo. Mi papá, que no usa nada, confirmó solo.', event_type: 'boda', city: 'Querétaro', created_at: '2026-09-01', approved_at: '2026-09-02', featured: true },
  { id: '2', author_name: 'Fam. Ramírez', rating: 5, body: 'La de XV años de mi hija salió en un día. Súper fácil de mandar por WhatsApp.', event_type: 'xv', city: 'CDMX', created_at: '2026-09-05', approved_at: '2026-09-06', featured: false },
  { id: '3', author_name: 'Karla', rating: 4, body: 'Me encantó poder cambiar los colores yo misma. Lo único, me hubiera gustado más tipografías.', event_type: 'baby_shower', city: 'Monterrey', created_at: '2026-09-10', approved_at: null, featured: false },
];

/** Reseñas con datos de mentira. No existe en producción. */
export default async function DevReviews() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="bg-[#faf8f5]">
      <Reviews reviews={R.filter((r) => r.approved_at)} locale="es" title="Lo que dicen" subtitle="Reseñas de clientes reales, publicadas con su permiso." />
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <ReviewBox eventId="00000000-0000-0000-0000-000000000000" defaultName="Ana y Luis" existing={null} labels={{ title: '¿Nos dejas una reseña?', hint: 'Nos ayuda muchísimo. La revisamos y, si nos das permiso, la publicamos en holaboda.mx con tu nombre y tu ciudad.', name: 'Tu nombre (como quieres que aparezca)', city: 'Ciudad (opcional)', rating: 'Calificación', body: 'Cuéntanos cómo te fue', placeholder: 'Qué te gustó, cómo la recibieron tus invitados…', consent: 'Autorizo que se publique en holaboda.mx.', send: 'Enviar reseña', thanks: '¡Gracias!', already: 'Ya nos dejaste tu reseña.' }} />
        <ReviewsManager reviews={R} isAdmin />
      </div>
    </main>
  );
}
