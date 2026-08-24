-- Les default privileges du schema public accordent SELECT a anon/authenticated
-- sur toute nouvelle table. bot_identities stocke des refresh tokens : on retire
-- tout acces en dehors de service_role (la RLS sans policy bloquait deja les
-- lignes, ceci supprime aussi la surface).
revoke all on public.bot_identities from anon, authenticated;

-- agent_audit_log : anon n'a rien a y faire non plus.
revoke all on public.agent_audit_log from anon;
