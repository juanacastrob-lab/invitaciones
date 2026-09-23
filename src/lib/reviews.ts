import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PublicReview { id: string; author_name: string; rating: number; body: string; event_type: string; city: string | null; created_at: string }

/** Reseñas aprobadas para la portada. Cacheadas una hora; se invalidan al aprobar. */
export const getApprovedReviews = unstable_cache(
  async (): Promise<PublicReview[]> => {
    let admin;
    try { admin = supabaseAdmin(); } catch { return []; }
    const { data, error } = await admin
      .from('reviews')
      .select('id, author_name, rating, body, event_type, city, created_at')
      .not('approved_at', 'is', null)
      .order('featured', { ascending: false })
      .order('approved_at', { ascending: false })
      .limit(9);
    if (error) { console.error('[reviews]', error.message); return []; }
    return (data ?? []) as PublicReview[];
  },
  ['approved-reviews'],
  { revalidate: 3600, tags: ['reviews'] },
);
