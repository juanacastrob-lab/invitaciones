import { Landing } from '@/components/landing/Landing';

/** Portada en inglés. Ruta propia para que siga siendo estática. */
export const revalidate = 3600;

export default function HomePageEn() {
  return <Landing locale="en" />;
}
