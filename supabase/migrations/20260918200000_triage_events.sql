-- Claude classe chaque mail a l'arrivee : resume, categorie, urgence, action
-- proposee. Le resultat va dans payload.ai de work.events, et l'urgence
-- calculee remplace celle des mots-cles. Deux wrappers pour le worker du Pi
-- (JWT utilisateur, RLS) : ce qui reste a trier, et l'annotation.
create or replace function public.work_events_a_trier(p_limit integer default 10)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
    from (
      select id, brand, type, source, title, payload, urgency, occurred_at
        from work.events
       where user_id = auth.uid()
         and processed = false
         and payload -> 'ai' is null
         and source in ('imap-ovh', 'woocommerce-mail', 'amelia')
         -- Pas le rattrapage d'un mois : seulement ce qui vient d'arriver.
         and occurred_at >= now() - interval '2 days'
       order by occurred_at desc
       limit p_limit
    ) e;
$$;

create or replace function public.annotate_work_event(p_id bigint, p_ai jsonb, p_urgency integer default null)
  returns void
  language sql
  security invoker
  set search_path = ''
as $$
  update work.events
     set payload = payload || jsonb_build_object('ai', p_ai),
         urgency = coalesce(p_urgency, urgency)
   where id = p_id and user_id = auth.uid();
$$;

revoke execute on function public.work_events_a_trier(integer) from public, anon;
revoke execute on function public.annotate_work_event(bigint, jsonb, integer) from public, anon;
grant execute on function public.work_events_a_trier(integer) to authenticated;
grant execute on function public.annotate_work_event(bigint, jsonb, integer) to authenticated;

-- Le poste lit l'annotation (colonne ajoutee en fin de vue).
create or replace view work.v_inbox as
  select id, brand, type, source, title,
         payload ->> 'from' as expediteur,
         urgency, occurred_at,
         round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
         payload ->> 'snippet' as extrait,
         payload ->> 'mailbox' as boite,
         coalesce((payload ->> 'attachments')::int, 0) as pieces,
         payload -> 'ai' as ai
    from work.events
   where processed = false
   order by urgency, occurred_at desc;
alter view work.v_inbox set (security_invoker = on);
