/**
 * Botones de "cómo llegar".
 *
 * Con coordenadas se abre el punto exacto; sin ellas, una búsqueda por
 * dirección. Waze y Apple Maps están porque en México y Estados Unidos mucha
 * gente no usa Google Maps, y un invitado perdido es un lugar vacío.
 */

export interface MapTarget {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

const query = (v: MapTarget) => `${v.name}, ${v.address}`;

export function googleMapsUrl(v: MapTarget & { mapsUrl?: string }): string {
  if (v.mapsUrl) return v.mapsUrl;
  const params = new URLSearchParams({ api: '1' });
  if (v.lat !== undefined && v.lng !== undefined) {
    params.set('query', `${v.lat},${v.lng}`);
  } else {
    params.set('query', query(v));
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function wazeUrl(v: MapTarget): string {
  if (v.lat !== undefined && v.lng !== undefined) {
    return `https://waze.com/ul?ll=${v.lat},${v.lng}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(query(v))}&navigate=yes`;
}

export function appleMapsUrl(v: MapTarget): string {
  const params = new URLSearchParams();
  if (v.lat !== undefined && v.lng !== undefined) {
    params.set('ll', `${v.lat},${v.lng}`);
    params.set('q', v.name);
  } else {
    params.set('q', query(v));
  }
  return `https://maps.apple.com/?${params.toString()}`;
}
