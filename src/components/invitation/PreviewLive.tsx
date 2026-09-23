'use client';

import { useEffect } from 'react';
import { resolveTemplate, type ColorOverrides } from '@/templates/registry';
import { fontCss } from '@/lib/fonts';

/**
 * Dentro del iframe de vista previa: recibe colores y fuente de la tienda y
 * los aplica al instante como variables CSS, sin recargar. Los textos sí
 * requieren recargar (los manda el servidor).
 */
export function PreviewLive() {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data as { type?: string; template?: string; colors?: ColorOverrides; font?: string } | null;
      if (!m || m.type !== 'hb:theme') return;
      const root = document.querySelector<HTMLElement>('[data-invitation-root]');
      if (!root) return;
      const th = resolveTemplate(m.template, m.colors);
      root.style.setProperty('--paper', th.colors.paper);
      root.style.setProperty('--ink', th.colors.ink);
      root.style.setProperty('--muted', th.colors.muted);
      root.style.setProperty('--line', th.colors.line);
      root.style.setProperty('--accent', th.colors.accent);
      root.style.setProperty('--accent-soft', th.colors.accentSoft);
      root.style.setProperty('--font-display', fontCss(m.font));
      root.style.setProperty('--font-serif', fontCss(m.font));
      root.style.colorScheme = th.dark ? 'dark' : 'light';
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return null;
}
