-- F1 : coupe l'ecriture non authentifiee dans work.events.
-- public.log_work_event est SECURITY DEFINER et restait executable par anon
-- (oubli de la migration 20260813132506 work_events_rpc_lockdown).
revoke all on function public.log_work_event(text, text, text, text, jsonb, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.log_work_event(text, text, text, text, jsonb, integer, text, timestamptz) to service_role;

-- meme traitement pour les fonctions work.* sous-jacentes (invoker, mais inutile d'exposer).
revoke all on function work.log_event(text, text, text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function work.log_event(text, text, text, text, jsonb, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function work.mark_events_processed(bigint[]) from public, anon, authenticated;
