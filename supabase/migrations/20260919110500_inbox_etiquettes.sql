-- Le poste doit savoir a quelle commande d'etiquettes un mail est rattache
-- (payload.etiquettes, pose par le triage) pour proposer « Valider le BAT ».
create or replace view work.v_inbox as
  select id, brand, type, source, title,
         payload ->> 'from' as expediteur,
         urgency, occurred_at,
         round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
         payload ->> 'snippet' as extrait,
         payload ->> 'mailbox' as boite,
         coalesce((payload ->> 'attachments')::int, 0) as pieces,
         payload -> 'ai' as ai,
         payload ->> 'text' as texte,
         payload -> 'files' as fichiers,
         payload -> 'etiquettes' as etiquettes
    from work.events
   where processed = false
   order by urgency, occurred_at desc;
alter view work.v_inbox set (security_invoker = on);

create or replace function public.get_work_courrier(p_jours integer default 7)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.occurred_at desc), '[]'::jsonb)
    from (
      select id, brand, type, source, title,
             payload ->> 'from' as expediteur,
             urgency, occurred_at, processed,
             round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
             payload ->> 'snippet' as extrait,
             payload ->> 'mailbox' as boite,
             coalesce((payload ->> 'attachments')::int, 0) as pieces,
             payload -> 'ai' as ai,
             payload ->> 'text' as texte,
             payload -> 'files' as fichiers,
             payload -> 'etiquettes' as etiquettes
        from work.events
       where user_id = auth.uid()
         and occurred_at >= now() - make_interval(days => p_jours)
    ) e;
$$;
