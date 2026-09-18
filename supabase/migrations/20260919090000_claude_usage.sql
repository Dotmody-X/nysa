-- Combien Claude a travaille : demandes du poste/Discord et triages de mails
-- sur les N derniers jours. Pour le pouls du matin et l'en-tete du poste —
-- l'abonnement n'est pas infini, autant le voir.
create or replace function public.get_claude_usage(p_jours integer default 1)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select jsonb_build_object(
    'demandes', (select count(*) from work.agent_requests
                  where user_id = auth.uid() and created_at >= now() - make_interval(days => p_jours)),
    'triages',  (select count(*) from work.events
                  where user_id = auth.uid()
                    and (payload -> 'ai' ->> 'le')::timestamptz >= now() - make_interval(days => p_jours))
  );
$$;
revoke execute on function public.get_claude_usage(integer) from public, anon;
grant execute on function public.get_claude_usage(integer) to authenticated;
