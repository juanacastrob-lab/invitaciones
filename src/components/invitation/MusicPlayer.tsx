'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Música de fondo.
 *
 * El archivo NO se baja en la carga inicial: el elemento de audio se crea
 * hasta que el invitado toca play. En 4G, precargar una canción es medio
 * megabyte antes de que se vea la portada.
 */
export function MusicPlayer({
  url,
  title,
  playLabel,
  pauseLabel,
}: {
  url: string;
  title?: string;
  playLabel: string;
  pauseLabel: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function ensure() {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('play', () => setPlaying(true));
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  // El sobre avisa al abrirse: como hubo un toque, el navegador deja sonar.
  useEffect(() => {
    const start = () => { void ensure().play().catch(() => setPlaying(false)); };
    window.addEventListener('hb:play', start);
    return () => window.removeEventListener('hb:play', start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  function toggle() {
    const audio = ensure();
    if (playing) {
      audio.pause();
    } else {
      void audio.play().catch(() => setPlaying(false));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? pauseLabel : playLabel}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <span aria-hidden className="text-sm">{playing ? '❚❚' : '▶'}</span>
      {title ?? (playing ? pauseLabel : playLabel)}
    </button>
  );
}
