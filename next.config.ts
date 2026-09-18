import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Las fotos de los eventos viven en Supabase Storage, ya optimizadas en WebP.
    // Se sirven sin pasar por el Image CDN de Netlify para no gastar creditos.
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
