'use client';

import { useEffect } from 'react';

/**
 * Lo que ve un invitado si la invitación truena.
 *
 * Nunca la pantalla gris de Chrome: un mensaje amable en los dos idiomas y
 * un código para que el equipo encuentre el error en los logs. El detalle
 * técnico se queda en el servidor, no en el celular del invitado.
 */
export default function InvitationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[invitacion] error en la página:', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#faf8f5] px-6 text-center text-[#2e2c29]">
      <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[#8a837a]">Ups</p>
      <h1 className="mt-4 font-serif text-3xl">No pudimos abrir la invitación</h1>
      <p className="mt-2 text-sm text-[#8a837a]">We couldn&apos;t open the invitation.</p>
      <p className="mt-6 max-w-xs text-sm leading-relaxed text-[#8a837a]">
        Intenta de nuevo en un momento. Si sigue igual, avísale a quien te mandó el link.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full border border-[#e2dcd3] px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#8a837a]"
      >
        Reintentar · Retry
      </button>
      {error.digest ? (
        <p className="mt-10 font-mono text-[0.65rem] text-[#c9c2b8]">ref {error.digest}</p>
      ) : null}
    </main>
  );
}
