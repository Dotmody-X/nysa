-- Le schema work n'est pas expose a PostgREST : l'agent (comme le front) doit
-- passer par les wrappers public. get_work_inbox et get_last_work_digest sont
-- deja en invoker + RLS ; on aligne les deux derniers.
--
-- Les corps appellent directement work.* au lieu de passer par les fonctions
-- work.mark_events_processed / work.write_digest, dont l'EXECUTE a ete revoque
-- a authenticated. La RLS (events_own, digests) reste le garde-fou.

create or replace function public.mark_work_events_processed(p_ids bigint[])
  returns integer
  language sql
  security invoker
  set search_path = ''
as $$
  with upd as (
    update work.events set processed = true
     where id = any(p_ids) and processed = false
    returning 1
  )
  select count(*)::int from upd;
$$;

create or replace function public.write_work_digest(p_kind text, p_content text)
  returns bigint
  language sql
  security invoker
  set search_path = ''
as $$
  insert into work.digests (kind, content, user_id)
  values (p_kind, p_content, auth.uid())
  returning id;
$$;

-- Surcharge a 3 arguments SANS valeur par defaut : evite l'ambiguite de
-- resolution avec la version a 2 arguments.
create or replace function public.write_work_digest(p_kind text, p_content text, p_payload jsonb)
  returns bigint
  language sql
  security invoker
  set search_path = ''
as $$
  insert into work.digests (kind, content, payload, user_id)
  values (p_kind, p_content, p_payload, auth.uid())
  returning id;
$$;

grant insert on work.digests to authenticated;

grant execute on function public.mark_work_events_processed(bigint[]) to authenticated;
grant execute on function public.write_work_digest(text, text) to authenticated;
grant execute on function public.write_work_digest(text, text, jsonb) to authenticated;
