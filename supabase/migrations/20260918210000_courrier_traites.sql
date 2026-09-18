-- Le poste peut montrer aussi le courrier deja traite : les evenements des
-- N derniers jours, traites ou non, sous la RLS. Meme forme que v_inbox,
-- plus le drapeau processed.
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
             payload -> 'ai' as ai
        from work.events
       where user_id = auth.uid()
         and occurred_at >= now() - make_interval(days => p_jours)
    ) e;
$$;
revoke execute on function public.get_work_courrier(integer) from public, anon;
grant execute on function public.get_work_courrier(integer) to authenticated;
