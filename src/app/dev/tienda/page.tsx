import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Checkout } from '@/components/store/Checkout';
import { BANK_DETAILS } from '@/lib/config';
import { EVENT_TYPES_BY_REGION } from '@/lib/event-types';
import { FONT_VARIABLE_CLASSES } from '@/lib/fonts-loader';

export const dynamic = 'force-dynamic';

/** La tienda con datos de mentira, para revisar el diseño sin base. No existe en producción. */
export default async function DevStore({ searchParams }: { searchParams: Promise<{ lang?: string; region?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang, region } = await searchParams;
  const reg = region === 'US' ? 'US' : 'MX';
  const locale = lang === 'en' ? 'en' : 'es';
  const messages = await getMessages({ locale });
  const packages = [
    { code: 'express', name: 'Express', price: 399, currency: 'MXN', features: ['invitacion_pdf', 'diseno_desde_plantilla', 'entrega_correo', 'entrega_20_min'] },
    { code: 'esencial', name: 'Esencial', price: 690, currency: 'MXN', features: ['invitacion_web', 'link_general', 'itinerario_mapas', 'mesa_regalos', 'rsvp_formulario'] },
    { code: 'con_pases', name: 'Con pases', price: 1190, currency: 'MXN', features: ['invitacion_web', 'pases_personalizados', 'panel_novios', 'export_excel', 'cola_whatsapp'] },
    { code: 'premium', name: 'Premium', price: 1990, currency: 'MXN', features: ['invitacion_web', 'pases_personalizados', 'qr_checkin', 'mesas', 'diseno_medida', 'save_the_date', 'thank_you'] },
  ];
  const extras = [
    { code: 'qr_checkin', name: 'Pase con QR y check-in', description: 'Cada invitado recibe un pase con QR.', price: 800, included_in: ['premium'] },
    { code: 'musica', name: 'Música de fondo', description: null, price: 300, included_in: ['completo', 'premium'] },
    { code: 'dominio_propio', name: 'Dominio propio', description: 'Tu invitación en tu propio dominio.', price: 1200, included_in: [] },
  ];
  const labels: Record<string, string> = { invitacion_pdf: 'Invitación en PDF', entrega_20_min: 'Lista en 20 minutos', entrega_correo: 'Te llega a tu correo', link_general: 'Un link para todos tus invitados', rsvp_formulario: 'Confirmación por formulario', mesas: 'Acomodo de mesas', diseno_medida: 'Diseño a la medida', thank_you: 'Tarjeta de agradecimiento', export_excel: 'Exportar a Excel', diseno_desde_plantilla: 'Diseño desde plantilla', invitacion_web: 'Invitación web', rsvp: 'Confirmación de asistencia', panel_novios: 'Panel para los novios', idiomas_es_en: 'Español e inglés', pases_personalizados: 'Link personal por invitado', cola_whatsapp: 'Lista de envío por WhatsApp', galeria: 'Galería', musica: 'Música', envio_por_nosotros: 'Nosotros hacemos el envío', recordatorios: 'Recordatorios', qr_checkin: 'QR y check-in' };
  return (
    <main className="mx-auto max-w-3xl bg-[#faf8f5] px-5 py-10 text-stone-900">
      <NextIntlClientProvider locale={locale} messages={{ store: messages.store }}>
        <Checkout locale={locale} packages={packages} extras={extras} featureLabels={labels} bank={BANK_DETAILS} region={reg} eventTypes={EVENT_TYPES_BY_REGION[reg]} fontClasses={FONT_VARIABLE_CLASSES} />
      </NextIntlClientProvider>
    </main>
  );
}
