-- Les vues work.* etaient SECURITY DEFINER : v_open_tasks codait en dur l'UUID
-- du compte principal et servait donc ses taches a tout appelant. On bascule
-- l'ensemble en security_invoker : la RLS de public.tasks/projects s'applique.
create or replace view work.v_open_tasks as
  select t.id,
         coalesce(p.groupe, 'Sans projet') as marque,
         p.name as projet,
         t.title, t.status, t.priority, t.due_date, t.due_time,
         t.estimated_minutes,
         t.due_date - current_date as days_left,
         current_date - t.created_at::date as age_days
    from public.tasks t
    left join public.projects p on p.id = t.project_id
   where t.status = any (array['todo','in_progress'])
     and (p.status is null or p.status = 'active')
     and t.user_id = auth.uid();

alter view work.v_open_tasks   set (security_invoker = on);
alter view work.v_late         set (security_invoker = on);
alter view work.v_upcoming     set (security_invoker = on);
alter view work.v_stalled      set (security_invoker = on);
alter view work.v_today        set (security_invoker = on);

-- v_inbox lit work.events : desormais filtre par la RLS events_own.
-- NB : le CREATE OR REPLACE doit preceder le ALTER ... security_invoker,
-- sinon il reinitialise les reloptions (corrige en 20260824074155).
create or replace view work.v_inbox as
  select id, brand, type, source, title,
         payload ->> 'from' as expediteur,
         urgency, occurred_at,
         round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures
    from work.events
   where processed = false
   order by urgency, occurred_at desc;

alter view work.v_inbox set (security_invoker = on);

grant select on work.v_open_tasks, work.v_late, work.v_upcoming,
                work.v_stalled, work.v_today, work.v_inbox to authenticated;

-- Les wrappers public.* : on quitte SECURITY DEFINER (qui bypassait la RLS et,
-- pour get_last_work_digest, n'avait aucun filtre utilisateur) pour le meme
-- schema que v_digests : invoker + RLS + search_path fige.
create or replace function public.get_work_inbox()
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb) from work.v_inbox v;
$$;

create or replace function public.get_last_work_digest(p_kind text)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select coalesce(to_jsonb(d), '{}'::jsonb)
    from work.digests d
   where d.kind = p_kind
     and d.user_id = auth.uid()
   order by d.generated_at desc
   limit 1;
$$;

grant select on work.digests to authenticated;
grant execute on function public.get_work_inbox() to authenticated;
grant execute on function public.get_last_work_digest(text) to authenticated;
