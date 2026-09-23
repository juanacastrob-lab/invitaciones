import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { ReviewsManager, type ReviewRow } from '@/components/admin/ReviewsManager';
import { countUnread } from '@/lib/admin/queries';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const me = await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const [{ data }, unread] = await Promise.all([
    supabase.from('reviews').select('id, author_name, rating, body, event_type, city, approved_at, featured, created_at, events(content)').order('approved_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }).limit(200),
    countUnread(),
  ]);
  const reviews: ReviewRow[] = (data ?? []).map((r) => {
    const ev = (Array.isArray(r.events) ? r.events[0] : r.events) as { content: EventContent } | null;
    const { events: _e, ...rest } = r as typeof r & { events: unknown };
    void _e;
    return { ...rest, event_name: ev?.content?.couple ? eventNames(ev.content.couple) : null } as ReviewRow;
  });
  return (
    <AdminShell me={me} title="Reseñas" current="/admin/reviews" unread={unread}>
      <ReviewsManager reviews={reviews} isAdmin={me.role === 'admin'} />
    </AdminShell>
  );
}
