'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/env';
import { whatsappLink } from '@/lib/config';
import { getActivePackages } from '@/lib/packages';
import { getActiveExtras } from '@/lib/store';
import { orderInput, priceOrder, type OrderResult } from '@/schemas/order';
import { normalizePhone } from '@/schemas/lead';
import { templateContent, slugFromNames } from '@/lib/admin/template';
import { isEventType } from '@/lib/event-types';

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'sin-ip';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * Pasarela simulada. Aprueba todo menos las tarjetas que terminan en 0000,
 * para poder enseñar también el caso de "rechazada". Cuando entre Stripe,
 * esta función es lo único que cambia.
 */
function simulateCard(card: { number: string }): boolean {
  return !card.number.endsWith('0000');
}

/**
 * Crea el pedido y, si queda pagado, deja todo listo para trabajar: el evento
 * en borrador con la plantilla, el acceso de los novios (y del planner) por
 * correo, y el link de acceso enviado. Si es transferencia, el evento se crea
 * cuando el equipo marca el pago.
 */
export async function createOrder(raw: unknown): Promise<OrderResult> {
  const parsed = orderInput.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    if (issues.some((i) => i.path[0] === 'consent')) return { ok: false, error: 'consent_required' };
    if (issues.some((i) => i.message === 'planner_email_required')) return { ok: false, error: 'planner_email_required', field: 'plannerEmail' };
    return { ok: false, error: 'invalid', field: issues[0]?.path.map(String).join('.') };
  }
  const input = parsed.data;

  const phone = normalizePhone(input.phone, input.country);
  if (!phone) return { ok: false, error: 'phone_invalid', field: 'phone' };

  const admin = supabaseAdmin();

  const { data: allowed } = await admin.rpc('rate_limit_check', { p_bucket: `order:${await clientKey()}`, p_max: 5, p_window: '1 hour' });
  if (allowed === false) return { ok: false, error: 'too_many_attempts' };

  // Precios de la base, nunca del navegador.
  const [packages, extras] = await Promise.all([getActivePackages(input.country), getActiveExtras(input.country)]);
  const pkg = packages.find((p) => p.code === input.packageCode);
  if (!pkg) return { ok: false, error: 'package_unavailable', field: 'packageCode' };
  const { lines, total } = priceOrder(pkg, extras, input.extraCodes);

  let paid = false;
  if (input.paymentMethod === 'card_sim') {
    if (!input.card || !simulateCard(input.card)) return { ok: false, error: 'card_declined', field: 'card' };
    paid = true;
  }

  const contact = { partner_a: input.partnerA, partner_b: input.partnerB || null, email: input.email, phone, event_date: input.eventDate || null };

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      event_type: input.eventType,
      country: input.country,
      currency: pkg.currency,
      package_code: pkg.code,
      package_name: pkg.name,
      package_price: pkg.price,
      extras: lines,
      total,
      build_mode: input.buildMode,
      planner_email: input.buildMode === 'planner' ? input.plannerEmail || null : null,
      payment_method: input.paymentMethod,
      status: paid ? 'pagado' : 'pendiente',
      paid_at: paid ? new Date().toISOString() : null,
      contact,
    })
    .select('id, number')
    .single();

  if (error || !order) {
    console.error('[order] no se pudo crear:', error);
    return { ok: false, error: 'unknown' };
  }

  if (paid) {
    await admin.from('payments').insert({ order_id: order.id, amount: total, currency: pkg.currency, method: 'card_sim', reference: 'SIMULADO' });
    await provisionOrder(order.id);
  }

  // Cuenta del cliente: el link de acceso se manda desde el cliente con cookies,
  // para que el canje funcione en este mismo navegador.
  try {
    const site = getSiteUrl();
    const supabase = await supabaseServer();
    await supabase.auth.signInWithOtp({
      email: input.email,
      options: { emailRedirectTo: site ? `${site}/auth/callback?next=/panel` : undefined, data: { name: [input.partnerA, input.partnerB].filter(Boolean).join(' & ') } },
    });
  } catch (e) {
    console.warn('[order] no se mandó el correo de acceso:', e);
  }

  const msg = input.locale === 'en'
    ? `Hi! I'm ${input.partnerA}, I just placed order #${order.number} (${pkg.name}) on holaboda.`
    : `¡Hola! Soy ${input.partnerA}, acabo de hacer el pedido #${order.number} (${pkg.name}) en holaboda.`;

  return { ok: true, orderId: order.id, number: order.number, status: paid ? 'pagado' : 'pendiente', total, currency: pkg.currency, whatsappUrl: whatsappLink(msg) };
}

/**
 * Lo que pasa cuando un pedido queda pagado: evento en borrador desde la
 * plantilla, acceso por correo a los novios y al planner. Idempotente: si el
 * pedido ya tiene evento, no crea otro.
 */
export async function provisionOrder(orderId: string): Promise<{ eventId: string } | null> {
  const admin = supabaseAdmin();
  const { data: o } = await admin.from('orders').select('id, event_id, contact, build_mode, planner_email, country, event_type').eq('id', orderId).single();
  if (!o) return null;
  if (o.event_id) return { eventId: o.event_id };

  const c = o.contact as { partner_a: string; partner_b: string | null; email: string; event_date: string | null };
  const startsAt = `${c.event_date ?? new Date(Date.now() + 180 * 86400_000).toISOString().slice(0, 10)}T17:00`;
  const slug = slugFromNames(c.partner_a, c.partner_b ?? undefined, randomBytes(2).toString('hex'));
  const content = templateContent({ partnerA: c.partner_a, partnerB: c.partner_b ?? undefined, startsAt, type: isEventType(o.event_type) ? o.event_type : 'boda' });

  const { data: ev, error } = await admin
    .from('events')
    .insert({ slug, type: o.event_type, country: o.country, languages: ['es', 'en'], default_language: 'es', content, status: 'borrador' })
    .select('id')
    .single();
  if (error || !ev) {
    console.error('[order] no se pudo crear el evento:', error);
    return null;
  }

  await admin.from('orders').update({ event_id: ev.id }).eq('id', orderId);

  // Acceso por correo: el trigger de auth los liga en cuanto entren.
  const emails = [c.email, o.planner_email].filter((e): e is string => Boolean(e));
  for (const email of emails) {
    const { data: u } = await admin.from('event_member_invites').select('id').eq('event_id', ev.id).eq('email', email.toLowerCase()).maybeSingle();
    if (u) continue;
    // Si ya tiene cuenta, se liga ahora mismo.
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = users?.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    await admin.from('event_member_invites').insert({ event_id: ev.id, email: email.toLowerCase(), user_id: existing?.id ?? null, accepted_at: existing ? new Date().toISOString() : null });
    if (existing) await admin.from('event_members').insert({ event_id: ev.id, user_id: existing.id });
  }

  return { eventId: ev.id };
}
