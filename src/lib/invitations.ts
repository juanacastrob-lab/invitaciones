import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { eventContent } from '@/schemas/event-content';
import { resolveLocale } from '@/lib/locale';

/**
 * Lectura de la invitación pública.
 *
 * La base ya filtra qué puede ver cada quien (ver 003_guest_access.sql). Aquí
 * se valida la forma de lo que llega: si alguien editara el JSON a mano en el
 * dashboard y lo dejara inválido, más vale enterarse aquí que pintar una
 * invitación rota en el celular de un invitado.
 */

const guestSchema = z.object({
  display_name: z.string(),
  passes: z.number().int().positive(),
  language: z.string(),
  status: z.enum(['pending', 'confirmed', 'declined']),
  confirmed_count: z.number().int().nonnegative(),
  group_tag: z.string().nullable(),
  responded_at: z.string().nullable(),
  response: z
    .object({
      attending: z.boolean(),
      count: z.number().int().nonnegative(),
      attendee_names: z.array(z.string()),
      menu_choices: z.record(z.string(), z.string()),
      dietary: z.string().nullable(),
      song: z.string().nullable(),
      message: z.string().nullable(),
      created_at: z.string(),
    })
    .nullable(),
});

const invitationSchema = z.object({
  access: z.enum(['public', 'preview', 'token']),
  token_valid: z.boolean(),
  event: z.object({
    slug: z.string(),
    type: z.string(),
    template: z.string(),
    languages: z.array(z.string()).min(1),
    default_language: z.string(),
    timezone: z.string(),
    status: z.string(),
    rsvp_deadline: z.string().nullable(),
    allow_public_rsvp: z.boolean(),
    og_image_url: z.string().nullable(),
    content: eventContent,
  }),
  guest: guestSchema.nullable(),
});

export type Invitation = z.infer<typeof invitationSchema>;
export type InvitationGuest = z.infer<typeof guestSchema>;

/** `null` = no existe, o es un borrador sin llave de revisión. */
export async function getInvitation(
  slug: string,
  token?: string | null,
  previewKey?: string | null,
): Promise<Invitation | null> {
  const { data, error } = await supabaseAdmin().rpc('rpc_get_invitation', {
    p_slug: slug,
    p_token: token ?? null,
    p_preview_key: previewKey ?? null,
  });

  if (error) {
    console.error(`[invitacion] Supabase falló leyendo "${slug}":`, error);
    throw new Error(`No se pudo leer la invitación: ${error.message}`);
  }
  if (data === null) return null;

  const parsed = invitationSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `El contenido del evento "${slug}" no es válido: ` +
        parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '),
    );
  }

  return parsed.data;
}

/** Registra la primera apertura. Nunca debe tumbar la página si falla. */
export async function markOpened(slug: string, token: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc('rpc_mark_opened', {
    p_slug: slug,
    p_token: token,
  });

  if (error) console.error(`No se pudo marcar la apertura de ${slug}:`, error.message);
}

/** Atajo: el idioma que toca para esta invitación. */
export function localeFor(invitation: Invitation, requested?: string | null) {
  return resolveLocale({
    languages: invitation.event.languages,
    defaultLanguage: invitation.event.default_language,
    guestLanguage: invitation.guest?.language,
    requested,
  });
}
