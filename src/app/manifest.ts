import type { MetadataRoute } from 'next';
import { APP_NAME } from '@/lib/config';

/**
 * La app instalable para el equipo: desde el celular, "Agregar a pantalla de
 * inicio" y abre directo en el admin, sin barra del navegador. Los novios
 * pueden instalarla igual: al entrar, cada quien cae en su panel.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · Equipo`,
    short_name: APP_NAME,
    description: 'Eventos, invitados, envíos y check-in desde el celular.',
    start_url: '/admin?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf8f5',
    theme_color: '#faf8f5',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Eventos', url: '/admin/events', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Pedidos', url: '/admin/orders' },
      { name: 'Prospectos', url: '/admin/leads' },
    ],
  };
}
