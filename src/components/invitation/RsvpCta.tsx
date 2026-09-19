'use client';

import { useEffect, useState } from 'react';

/**
 * Botón fijo abajo, "Confirmar asistencia", en el link personal. Se esconde
 * cuando el formulario ya está a la vista. Es para que nadie tenga que buscar
 * dónde se confirma.
 */
export function RsvpCta({ label, targetId }: { label: string; targetId: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-300 ${hidden ? 'pointer-events-none translate-y-6 opacity-0' : 'opacity-100'}`}>
      <a
        href={`#${targetId}`}
        onClick={(e) => { e.preventDefault(); document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
        className="w-full max-w-md rounded-full bg-[var(--ink)] px-6 py-4 text-center text-xs uppercase tracking-[0.25em] text-[var(--paper)] shadow-xl"
      >
        {label}
      </a>
    </div>
  );
}
