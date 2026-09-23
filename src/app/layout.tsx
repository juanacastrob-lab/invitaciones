import type { Metadata } from 'next';
import { MetaPixel } from '@/components/MetaPixel';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { APP_NAME } from '@/lib/config';
import './globals.css';

/**
 * Next descarga y sirve estas tipografías desde nuestro propio dominio al
 * construir: cero peticiones a Google desde el celular del invitado, que en
 * 4G se notan.
 */
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Jost({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Invitaciones de boda digitales y wedding sites. Un link personal para cada invitado y confirmación desde el celular.',
  // Preview al compartir la portada por WhatsApp / iMessage. Las invitaciones tienen el suyo.
  openGraph: { images: [{ url: '/brand/hero-og.jpg', width: 1200, height: 630 }] },
  // Instalable en iPhone y Android: el manifest vive en manifest.ts.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  applicationName: APP_NAME,
  formatDetection: { telephone: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin zoom raro en los inputs de iPhone y con la barra del sistema del color del fondo.
  viewportFit: 'cover' as const,
  themeColor: '#faf8f5',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
