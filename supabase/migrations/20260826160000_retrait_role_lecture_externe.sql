-- Retrait de l'acces machine en lecture seule : une autre solution a ete
-- retenue pour donner a un tiers la lecture de Nysa.
--
-- Le mot de passe du role avait de plus transite par une conversation : meme
-- inutilise, il constituait un acces vivant aux clients, projets et budgets.
-- On ferme plutot que de laisser dormir.
--
-- Annule 20260826153134_role_lecture_externe_nysa_pro.sql

drop schema if exists lecture_externe cascade;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'nysa_lecture') then
    -- « drop owned by » exige l'appartenance au role. Le compte de gestion l'a
    -- cree, donc il en detient l'administration et peut se l'accorder.
    execute format('grant nysa_lecture to %I', current_user);
    execute 'drop owned by nysa_lecture';
    execute 'drop role nysa_lecture';
  end if;
end $$;
