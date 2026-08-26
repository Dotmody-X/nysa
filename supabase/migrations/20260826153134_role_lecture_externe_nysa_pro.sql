-- Acces machine en LECTURE SEULE aux donnees professionnelles de Nysa.
--
-- Destine a un programme tiers (l'assistant de Gaetano) : pas de compte
-- utilisateur, pas de connexion interactive, pas d'expiration de jeton. Le
-- programme se connecte en Postgres avec le role « nysa_lecture ».
--
-- Le role ne voit QUE le schema « lecture_externe », qui ne contient que des
-- vues deja filtrees sur l'utilisateur proprietaire. Il n'a aucun privilege sur
-- les tables de base : meme en cas de fuite de son mot de passe, la surface
-- exposee reste exactement celle decrite ici.
--
-- Hors perimetre volontairement :
--   - les 11 tables personnelles (sante, running, recettes, repas, budgets,
--     transactions, courses) ;
--   - « integrations », qui stocke des jetons OAuth en clair ;
--   - la colonne « motdepasse » de client_acces.
--
-- Revocation complete : drop owned by nysa_lecture; drop role nysa_lecture;

create schema if not exists lecture_externe;

do $$
declare
  t text;
  proprietaire constant uuid := 'd79794c8-ea3f-4709-8112-01ddb4b3a51d';
  tables constant text[] := array[
    'clients', 'imprimantes',
    'tasks', 'projects', 'time_entries',
    'project_notes', 'project_files', 'project_settings',
    'publications', 'notes', 'events',
    'product_prices', 'inventory', 'objectives_wins', 'formation_milestones'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create or replace view lecture_externe.%I as select * from public.%I where user_id = %L::uuid',
      t, t, proprietaire);
  end loop;
end $$;

-- Cas particulier : les identifiants clients sans les mots de passe.
create or replace view lecture_externe.client_acces as
  select id, user_id, client_id, service, identifiant, date_creation,
         mail_identifiants_envoye, mail_mise_a_dispo_envoye, mail_installation_envoye,
         notes, created_at, updated_at
    from public.client_acces
   where user_id = 'd79794c8-ea3f-4709-8112-01ddb4b3a51d'::uuid;

-- Les vues restent en security_invoker = off (defaut) : elles s'executent avec
-- les droits de leur proprietaire, ce qui permet au role de lire sans qu'on ait
-- a lui ouvrir la moindre policy RLS sur les tables sous-jacentes.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'nysa_lecture') then
    -- Sans mot de passe : le role ne peut pas encore se connecter. C'est
    -- volontaire, le mot de passe est pose separement pour ne jamais transiter
    -- par un fichier de migration versionne.
    create role nysa_lecture with login noinherit;
  end if;
end $$;

grant usage on schema lecture_externe to nysa_lecture;
grant select on all tables in schema lecture_externe to nysa_lecture;

alter default privileges in schema lecture_externe
  grant select on tables to nysa_lecture;

-- Ceinture et bretelles : rien d'ecrivable, rien hors du schema dedie.
revoke all on schema public from nysa_lecture;
revoke create on schema lecture_externe from nysa_lecture;
