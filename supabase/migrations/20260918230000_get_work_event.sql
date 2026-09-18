-- Un evenement par son identifiant, sous RLS : l'outil envoyer_mail s'en sert
-- pour repondre au bon message (destinataire, objet, Message-ID, boite).
create or replace function public.get_work_event(p_id bigint)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select to_jsonb(e)
    from (
      select id, brand, type, source, title, payload, urgency, occurred_at, processed, external_id
        from work.events
       where id = p_id and user_id = auth.uid()
    ) e;
$$;
revoke execute on function public.get_work_event(bigint) from public, anon;
grant execute on function public.get_work_event(bigint) to authenticated;
