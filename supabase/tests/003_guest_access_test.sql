\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

create or replace function t_check(nombre text, esperado text, obtenido text)
returns void language plpgsql as $$
begin
  if esperado is not distinct from obtenido then
    raise notice '  OK   %', nombre;
  else
    raise notice '  FALLA % -> esperaba [%], obtuvo [%]', nombre, esperado, obtenido;
  end if;
end;
$$;

-- Un segundo evento, en borrador, con su propio invitado.
insert into events (slug, status, content, show_private_gifts)
values ('otra-boda', 'borrador', '{"version":1}'::jsonb, true)
on conflict (slug) do nothing;

insert into guests (event_id, display_name, passes, token)
select id, 'Invitado de la otra boda', 3, 'TOKEN-DE-OTRO-EVENTO'
from events where slug = 'otra-boda'
  and not exists (select 1 from guests where token = 'TOKEN-DE-OTRO-EVENTO');

\echo ''
\echo '--- link general de un evento publicado ---'
select t_check('deja ver el evento', 'public',
  rpc_get_invitation('ana-y-luis') ->> 'access');
select t_check('no trae datos de ningun invitado', 'null',
  coalesce(rpc_get_invitation('ana-y-luis') -> 'guest', 'null'::jsonb)::text);
select t_check('esconde los datos bancarios', 'false',
  (rpc_get_invitation('ana-y-luis') -> 'event' -> 'content' -> 'gifts' ? 'bank')::text);
select t_check('apaga los sobres', 'false',
  rpc_get_invitation('ana-y-luis') -> 'event' -> 'content' -> 'gifts' ->> 'envelopes');

\echo ''
\echo '--- link personal con token valido ---'
select t_check('reconoce el token', 'token',
  rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz')) ->> 'access');
select t_check('saluda por su nombre', 'Mariana Ruiz',
  rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz')) -> 'guest' ->> 'display_name');
select t_check('trae sus pases', '2',
  rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz')) -> 'guest' ->> 'passes');
select t_check('si muestra los datos bancarios', 'true',
  (rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz')) -> 'event' -> 'content' -> 'gifts' ? 'bank')::text);

\echo ''
\echo '--- token invalido: se cae al link general, sin dar pistas ---'
select t_check('no reconoce el token', 'false',
  rpc_get_invitation('ana-y-luis', 'estoyInventando') ->> 'token_valid');
select t_check('no inventa un invitado', 'null',
  coalesce(rpc_get_invitation('ana-y-luis', 'estoyInventando') -> 'guest', 'null'::jsonb)::text);
select t_check('sigue escondiendo lo bancario', 'false',
  (rpc_get_invitation('ana-y-luis', 'estoyInventando') -> 'event' -> 'content' -> 'gifts' ? 'bank')::text);

\echo ''
\echo '--- token de OTRO evento: no sirve aqui ---'
select t_check('no da acceso cruzado', 'false',
  rpc_get_invitation('ana-y-luis', 'TOKEN-DE-OTRO-EVENTO') ->> 'token_valid');
select t_check('no filtra al invitado ajeno', 'null',
  coalesce(rpc_get_invitation('ana-y-luis', 'TOKEN-DE-OTRO-EVENTO') -> 'guest', 'null'::jsonb)::text);

\echo ''
\echo '--- borrador: invisible sin la llave de revision ---'
select t_check('borrador no se asoma', 'null',
  coalesce(rpc_get_invitation('otra-boda')::text, 'null'));
select t_check('ni con un token valido de ese evento', 'null',
  coalesce(rpc_get_invitation('otra-boda', 'TOKEN-DE-OTRO-EVENTO')::text, 'null'));
select t_check('con llave correcta si', 'preview',
  rpc_get_invitation('otra-boda', null, (select preview_key from events where slug = 'otra-boda')) ->> 'access');
select t_check('con llave equivocada no', 'null',
  coalesce(rpc_get_invitation('otra-boda', null, 'llave-inventada')::text, 'null'));

\echo ''
\echo '--- evento que no existe ---'
select t_check('no existe = nada', 'null',
  coalesce(rpc_get_invitation('boda-que-no-existe')::text, 'null'));

\echo ''
\echo '--- nunca salen datos internos ---'
select t_check('no expone la lista de invitados', 'false',
  (rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz'))::text like '%Familia Contreras%')::text);
select t_check('no expone la llave de revision', 'false',
  (rpc_get_invitation('ana-y-luis')::text like '%' || (select preview_key from events where slug = 'ana-y-luis') || '%')::text);
select t_check('no expone el id del evento', 'false',
  (rpc_get_invitation('ana-y-luis')::text like '%' || (select id::text from events where slug = 'ana-y-luis') || '%')::text);
select t_check('no expone el token de nadie mas', 'false',
  (rpc_get_invitation('ana-y-luis')::text like '%' || (select token from guests where display_name = 'Jorge Hernández') || '%')::text);

\echo ''
\echo '--- show_private_gifts apagado: ni con token ---'
begin;
  update events set show_private_gifts = false where slug = 'ana-y-luis';
  select t_check('respeta el interruptor', 'false',
    (rpc_get_invitation('ana-y-luis', (select token from guests where display_name = 'Mariana Ruiz')) -> 'event' -> 'content' -> 'gifts' ? 'bank')::text);
rollback;

\echo ''
\echo '--- primera apertura ---'
do $$
declare tk text; primera timestamptz; segunda timestamptz;
begin
  select token into tk from guests where display_name = 'Jorge Hernández';
  perform rpc_mark_opened('ana-y-luis', tk);
  select opened_at into primera from guests where token = tk;
  perform pg_sleep(0.05);
  perform rpc_mark_opened('ana-y-luis', tk);
  select opened_at into segunda from guests where token = tk;

  if primera is null then raise notice '  FALLA no marco la apertura';
  elsif primera <> segunda then raise notice '  FALLA sobreescribio la primera apertura';
  else raise notice '  OK   marca la primera apertura y no la pisa';
  end if;
end;
$$;

do $$
declare tk text; antes timestamptz;
begin
  select token into tk from guests where display_name = 'Sarah Whitfield';
  perform rpc_mark_opened('otra-boda', tk);   -- slug que no le toca
  select opened_at into antes from guests where token = tk;
  if antes is null then raise notice '  OK   no marca si el slug no corresponde';
  else raise notice '  FALLA marco con el slug equivocado';
  end if;
end;
$$;

\echo ''
\echo '--- rate limit ---'
do $$
declare permitidos int := 0; i int;
begin
  for i in 1..7 loop
    if rate_limit_check('prueba:' || clock_timestamp()::text, 5, interval '1 minute') then
      permitidos := permitidos + 1;
    end if;
  end loop;
  if permitidos = 7 then raise notice '  OK   buckets distintos no se estorban';
  else raise notice '  FALLA buckets distintos se estorban (% de 7)', permitidos;
  end if;

  permitidos := 0;
  for i in 1..7 loop
    if rate_limit_check('prueba-mismo-bucket', 5, interval '1 minute') then
      permitidos := permitidos + 1;
    end if;
  end loop;
  if permitidos = 5 then raise notice '  OK   corta al sexto intento del mismo bucket';
  else raise notice '  FALLA dejo pasar % de 7 (esperaba 5)', permitidos;
  end if;
end;
$$;
