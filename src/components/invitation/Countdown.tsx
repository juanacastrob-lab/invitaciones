'use client';

import { useEffect, useState } from 'react';

interface Labels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  today: string;
  past: string;
}

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Cuenta regresiva.
 *
 * El instante objetivo se calcula en el servidor, en la zona horaria del
 * evento, y llega ya resuelto: aquí solo se resta. Así el contador no depende
 * de cómo tenga configurado el reloj el invitado.
 *
 * No pinta nada hasta montar, para que el HTML del servidor y el del navegador
 * coincidan: si no, React se queja y parpadea.
 */
export function Countdown({ targetIso, labels }: { targetIso: string; labels: Labels }) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) {
    return <div className="h-20" aria-hidden />;
  }

  const remaining = target - now;

  if (remaining <= 0) {
    const sameDay = remaining > -86400_000;
    return (
      <p className="font-serif text-2xl text-[var(--ink)]">
        {sameDay ? labels.today : labels.past}
      </p>
    );
  }

  const t = split(remaining);
  const cells: [number, string][] = [
    [t.days, labels.days],
    [t.hours, labels.hours],
    [t.minutes, labels.minutes],
    [t.seconds, labels.seconds],
  ];

  return (
    <div className="flex items-start justify-center gap-5 sm:gap-8" role="timer">
      {cells.map(([value, label]) => (
        <div key={label} className="min-w-14 text-center">
          <div className="font-serif text-4xl tabular-nums text-[var(--ink)] sm:text-5xl">
            {String(value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)]">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
