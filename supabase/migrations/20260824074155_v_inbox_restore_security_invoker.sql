-- Le CREATE OR REPLACE VIEW de la migration precedente avait efface l'option
-- security_invoker posee juste avant sur work.v_inbox.
alter view work.v_inbox set (security_invoker = on);

-- work.write_digest conservait le GRANT EXECUTE par defaut au role PUBLIC.
-- Non exploitable (anon n'a pas USAGE sur le schema work) mais on l'enleve.
revoke all on function work.write_digest(text, text) from public, anon, authenticated;
revoke all on function work.write_digest(text, text, jsonb) from public, anon, authenticated;
