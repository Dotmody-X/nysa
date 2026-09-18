-- Le poste iPad lit l'inbox en direct : il lui faut l'extrait du mail, la
-- boite d'arrivee et le nombre de pieces, que nysa-mail met dans le payload.
-- Colonnes ajoutees en fin de vue : get_work_inbox() et l'agent les voient
-- sans changement.
create or replace view work.v_inbox as
  select id, brand, type, source, title,
         payload ->> 'from' as expediteur,
         urgency, occurred_at,
         round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
         payload ->> 'snippet' as extrait,
         payload ->> 'mailbox' as boite,
         coalesce((payload ->> 'attachments')::int, 0) as pieces
    from work.events
   where processed = false
   order by urgency, occurred_at desc;
alter view work.v_inbox set (security_invoker = on);

-- Le pouls du courrier : quand le dernier mail est arrive, combien attendent.
-- C'est l'alarme qui manquait quand n8n s'est tu un mois.
create or replace function public.get_work_pulse()
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select jsonb_build_object(
    'last_mail_at', (select max(occurred_at) from work.events where type = 'mail' and user_id = auth.uid()),
    'last_event_at', (select max(occurred_at) from work.events where user_id = auth.uid()),
    'unprocessed', (select count(*) from work.events where processed = false and user_id = auth.uid()),
    'today', (select count(*) from work.events
               where user_id = auth.uid()
                 and occurred_at >= (date_trunc('day', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels'))
  );
$$;
revoke execute on function public.get_work_pulse() from public, anon;
grant execute on function public.get_work_pulse() to authenticated;
