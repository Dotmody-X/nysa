-- REGRESSION corrigee : la version 20260824090030 ecrivait user_id = auth.uid()
-- sans repli. Or les taches planifiees (Claude desktop -> MCP Supabase) attaquent
-- Postgres en direct via mgmt-api, ou auth.uid() vaut NULL : l'insert violait
-- alors la contrainte NOT NULL et le brief du matin etait perdu.
--
-- On repasse par work.write_digest, qui porte deja la convention du projet
-- coalesce(auth.uid(), <owner>) :
--   - appelant authenticated -> son propre user_id, la RLS reste vraie ;
--   - appelant de confiance sans JWT (postgres/service_role) -> compte proprietaire.
-- SECURITY DEFINER est necessaire ici : l'EXECUTE de work.write_digest a ete
-- revoque a authenticated. anon n'a aucun EXECUTE sur ce wrapper.
create or replace function public.write_work_digest(p_kind text, p_content text)
  returns bigint
  language sql
  security definer
  set search_path = ''
as $$
  select work.write_digest(p_kind, p_content);
$$;

create or replace function public.write_work_digest(p_kind text, p_content text, p_payload jsonb)
  returns bigint
  language sql
  security definer
  set search_path = ''
as $$
  select work.write_digest(p_kind, p_content, p_payload);
$$;

revoke all on function public.write_work_digest(text, text) from public, anon;
revoke all on function public.write_work_digest(text, text, jsonb) from public, anon;
grant execute on function public.write_work_digest(text, text) to authenticated, service_role;
grant execute on function public.write_work_digest(text, text, jsonb) to authenticated, service_role;
