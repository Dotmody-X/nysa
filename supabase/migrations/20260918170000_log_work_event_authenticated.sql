-- nysa-mail depose le courrier sous une identite de service AUTHENTIFIEE
-- (JWT utilisateur, RLS), pas avec service_role. Le verrouillage du 24 aout
-- n'avait laisse l'execution qu'a service_role : on rouvre a authenticated.
-- La fonction est definer mais insere avec auth.uid() : un compte ne peut
-- ecrire que dans sa propre inbox. anon reste exclu.
grant execute on function public.log_work_event(text, text, text, text, jsonb, integer, text, timestamptz) to authenticated;
