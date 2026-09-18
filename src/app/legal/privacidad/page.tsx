import type { Metadata } from 'next';
import { APP_NAME, CONTACT_EMAIL, LEGAL_ENTITY, isLocale } from '@/lib/config';

export const metadata: Metadata = {
  title: `Aviso de privacidad · ${APP_NAME}`,
  robots: { index: false },
};

/**
 * Aviso de privacidad (MX) / Privacy notice (US, CA).
 *
 * Cubre lo que exige la LFPDPPP en México y lo básico de US/CA para un
 * formulario de confirmación. Responsable y correo salen de config, para
 * cambiarlos cuando haya empresa. Conviene que un abogado lo revise antes de
 * escalar.
 */
export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const en = isLocale(lang) && lang === 'en';

  return (
    <main className="mx-auto max-w-md px-6 py-14 text-stone-800">
      <p className="text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{APP_NAME}</p>
      <h1 className="mt-3 font-serif text-3xl">{en ? 'Privacy notice' : 'Aviso de privacidad'}</h1>

      {en ? (
        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Data controller:</strong> {LEGAL_ENTITY}, operating {APP_NAME} on behalf of the
            hosts of the event. When you RSVP, we collect the name(s) you enter, your attendance,
            and any optional details you choose to share (meal choice, dietary needs, song request,
            message).
          </p>
          <p>
            We use this information for one purpose only: to organize this event and share your
            answer with its hosts. We do not sell it, use it for advertising, or share it with
            anyone else.
          </p>
          <p>
            Your data is stored on secure servers and kept until the hosts close the event. You can
            ask to see, correct, or delete your information at any time by contacting the hosts or
            writing to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <p className="text-stone-500">Last updated: {new Date().getFullYear()}.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Responsable:</strong> {LEGAL_ENTITY}, quien opera {APP_NAME} a nombre de los
            anfitriones del evento. Al confirmar tu asistencia recabamos los nombres que escribas,
            si asistes o no, y los datos opcionales que decidas compartir (platillo, restricciones
            alimentarias, canción, mensaje).
          </p>
          <p>
            Usamos estos datos con una sola finalidad: organizar este evento y entregar tu
            respuesta a sus anfitriones. No los vendemos, no los usamos para publicidad ni los
            compartimos con nadie más.
          </p>
          <p>
            Tus datos se guardan en servidores seguros y se conservan hasta que los anfitriones
            cierren el evento. Puedes ejercer tus derechos ARCO (acceso, rectificación,
            cancelación y oposición) en cualquier momento a través de los anfitriones o
            escribiendo a <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <p className="text-stone-500">Última actualización: {new Date().getFullYear()}.</p>
        </div>
      )}
    </main>
  );
}
