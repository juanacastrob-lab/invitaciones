import { Landing } from '@/components/landing/Landing';

/** Portada en español. Estática, se regenera cada hora por los paquetes. */
export const revalidate = 3600;

export default function HomePage() {
  return <Landing locale="es" />;
}
