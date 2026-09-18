-- =============================================================================
-- 020_save_the_date.sql — Save the date y agradecimiento
--
-- El save the date sale meses antes, cuando la invitación todavía es un
-- borrador. Por eso tiene su propia función pública: solo entrega nombres,
-- fecha, portada y tarjeta, y solo si el equipo lo activó. El agradecimiento
-- usa el link personal normal (el evento ya está publicado o finalizado).
-- =============================================================================

alter table events add column if not exists save_the_date_enabled boolean not null default false;

create or replace function rpc_get_save_the_date(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e events%rowtype;
begin
  select * into e from events where slug = p_slug;
  if not found or not e.save_the_date_enabled or e.status = 'archivado' then
    return null;
  end if;
  return jsonb_build_object(
    'slug', e.slug,
    'type', e.type,
    'template', e.template,
    'languages', to_jsonb(e.languages),
    'default_language', e.default_language,
    'timezone', e.timezone,
    'couple', e.content -> 'couple',
    'startsAt', e.content -> 'startsAt',
    'cover', e.content -> 'cover',
    'og', e.content -> 'og',
    'note', e.content -> 'saveTheDate' -> 'note',
    'venue', e.content -> 'itinerary' -> 'acts' -> 0 -> 'venue' -> 'name'
  );
end;
$$;

revoke execute on function rpc_get_save_the_date(text) from public;
grant  execute on function rpc_get_save_the_date(text) to service_role;

insert into message_templates (key, language, body) values
  ('save_the_date', 'es',
   E'Hola {nombre} 👋\n\n{pareja} quieren que apartes la fecha: {fecha}.\n\nAquí está el save the date:\n{link}\n\nLa invitación completa llega pronto.'),
  ('save_the_date', 'en',
   E'Hi {nombre} 👋\n\n{pareja} would love for you to save the date: {fecha}.\n\nHere is the save the date:\n{link}\n\nThe full invitation is coming soon.'),
  ('thank_you', 'es',
   E'Hola {nombre},\n\n{pareja} te mandan un mensaje de agradecimiento:\n{link}\n\n¡Gracias por acompañarnos!'),
  ('thank_you', 'en',
   E'Hi {nombre},\n\n{pareja} sent you a thank-you note:\n{link}\n\nThank you for being with us!')
on conflict (key, language) do nothing;
