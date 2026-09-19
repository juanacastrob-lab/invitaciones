/** Lo que se lee de un QR: el link personal. Devuelve el token o null. */
export function tokenFromScan(text: string, slug: string): string | null {
  const m = text.trim().match(/\/i\/([^/?#]+)\/([A-Za-z0-9_-]{8,64})(?:[?#].*)?$/);
  if (!m) return null;
  return m[1] === slug ? m[2] : null;
}

export function checkinTotals(guests: { passes: number; confirmed_count: number; checked_in_at: string | null; checked_in_count: number; status: string }[]) {
  return {
    expected: guests.reduce((s, g) => s + (g.status === 'confirmed' ? g.confirmed_count : 0), 0),
    arrivedGroups: guests.filter((g) => g.checked_in_at).length,
    arrivedPeople: guests.reduce((s, g) => s + g.checked_in_count, 0),
    confirmedGroups: guests.filter((g) => g.status === 'confirmed').length,
  };
}
