/** Deja en sectionOrder solo las secciones con contenido (cover, countdown y rsvp no lo necesitan). */
export function dropEmptySections(data: unknown): unknown {
  if (!data || typeof data !== 'object') return null;
  const d = data as { event?: { content?: Record<string, unknown> } };
  const content = d.event?.content;
  if (!content || !Array.isArray(content.sectionOrder)) return null;
  const always = new Set(['cover', 'countdown', 'rsvp']);
  const order = (content.sectionOrder as unknown[]).filter((id) => typeof id === 'string' && (always.has(id) || content[id] !== undefined && content[id] !== null));
  if (order.length === content.sectionOrder.length) return null;
  return { ...d, event: { ...d.event, content: { ...content, sectionOrder: order } } };
}
