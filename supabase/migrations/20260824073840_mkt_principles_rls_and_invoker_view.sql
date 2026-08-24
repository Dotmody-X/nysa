-- F3 : la clause WHERE d'une vue SECURITY DEFINER etait l'unique barriere.
-- On active la RLS sur la table de base et on bascule la vue en security_invoker.
alter table work.mkt_principles enable row level security;

drop policy if exists mkt_principles_own on work.mkt_principles;
create policy mkt_principles_own on work.mkt_principles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- security_invoker exige un GRANT sur la table de base pour l'appelant reel.
grant select on work.mkt_principles to authenticated;

alter view public.v_mkt_principles set (security_invoker = on);
revoke all on public.v_mkt_principles from anon;
grant select on public.v_mkt_principles to authenticated;
