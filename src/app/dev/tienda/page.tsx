import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Checkout } from '@/components/store/Checkout';
import { BANK_DETAILS } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** La tienda con datos de mentira, para revisar el diseño sin base. No existe en producción. */
export default async function DevStore({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang } = await searchParams;
  const locale = lang === 'en' ? 'en' : 'es';
  const messages = await getMessages({ locale });
  const packages = [
    { code: 'express', name: 'Express', price: 899, currency: 'MXN', features: ['invitacion_pdf', 'diseno_desde_plantilla', 'entrega_20_min'] },
    { code: 'basico', name: 'Básico', price: 1399, currency: 'MXN', features: ['invitacion_pdf', 'diseno_desde_plantilla'] },
    { code: 'esencial', name: 'Esencial', price: 2800, currency: 'MXN', features: ['invitacion_web', 'rsvp', 'panel_novios', 'idiomas_es_en'] },
    { code: 'completo', name: 'Completo', price: 4800, currency: 'MXN', features: ['invitacion_web', 'rsvp', 'pases_personalizados', 'cola_whatsapp', 'galeria', 'musica'] },
    { code: 'premium', name: 'Premium', price: 5900, currency: 'MXN', features: ['invitacion_web', 'pases_personalizados', 'envio_por_nosotros', 'recordatorios', 'qr_checkin'] },
  ];
  const extras = [
    { code: 'qr_checkin', name: 'Pase con QR y check-in', description: 'Cada invitado recibe un pase con QR.', price: 800, included_in: ['premium'] },
    { code: 'musica', name: 'Música de fondo', description: null, price: 300, included_in: ['completo', 'premium'] },
    { code: 'dominio_propio', name: 'Dominio propio', description: 'Tu invitación en tu propio dominio.', price: 1200, included_in: [] },
  ];
  const labels: Record<string, string> = { invitacion_pdf: 'Invitación en PDF', entrega_20_min: 'Lista en 20 minutos', diseno_desde_plantilla: 'Diseño desde plantilla', invitacion_web: 'Invitación web', rsvp: 'Confirmación de asistencia', panel_novios: 'Panel para los novios', idiomas_es_en: 'Español e inglés', pases_personalizados: 'Link personal por invitado', cola_whatsapp: 'Lista de envío por WhatsApp', galeria: 'Galería', musica: 'Música', envio_por_nosotros: 'Nosotros hacemos el envío', recordatorios: 'Recordatorios', qr_checkin: 'QR y check-in' };
  return (
    <main className="mx-auto max-w-3xl bg-[#faf8f5] px-5 py-10 text-stone-900">
      <NextIntlClientProvider locale={locale} messages={{ store: messages.store }}>
        <Checkout locale={locale} packages={packages} extras={extras} featureLabels={labels} bank={BANK_DETAILS} />
      </NextIntlClientProvider>
    </main>
  );
}
