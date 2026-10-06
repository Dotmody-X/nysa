-- Le mini-cerveau de Nysa : ce qu'elle apprend de ses erreurs (Cahier des charges
-- du cerveau, §12, phase 9).
--
-- L'exemple fondateur : « mets ça dans mixo ». Nysa ne comprend pas, Nathan la
-- corrige une fois (« non, c'est Le Mixologue »), et elle ne refait plus l'erreur.
--
-- Deux tables, chacune a son proprietaire (RLS sur auth.uid()) :
--   memoire  ce que Nysa a retenu : alias, regles, preferences, erreurs types ;
--   erreurs  chaque correction brute (la demande, ce qui a ete compris, ce qui etait voulu).
--
-- On ne supprime rien : une regle « retiree » le reste (statut). Aucun droit DELETE.

create table public.memoire (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- alias : mixo -> Le Mixologue ; regle : « BAT » -> projet impression en cours ;
  -- preference : « les seances muscu le soir » ; erreur : ce qui a mal tourne.
  type text not null check (type in ('alias', 'regle', 'preference', 'erreur')),
  cle text not null,
  valeur text not null,
  -- La cible resolue, quand la valeur designe un projet precis ou une marque entiere
  -- (projects.groupe) : la resolution n'a plus a deviner.
  cible_projet uuid references public.projects(id) on delete set null,
  cible_groupe text,
  exemple text,
  -- correction : Nathan a corrige ; explicite : il l'a dit ; deduit : Nysa l'a remarque
  -- seule (reste a_confirmer, phase 11) ; lexique : recopie du lexique commun du cerveau.
  origine text not null check (origine in ('correction', 'explicite', 'deduit', 'lexique')),
  -- Monte a chaque usage sans dementi, retombe a 1 quand la regle est corrigee.
  confiance integer not null default 1,
  utilisations integer not null default 0,
  derniere_utilisation timestamptz,
  statut text not null default 'active' check (statut in ('active', 'a_confirmer', 'retiree')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une seule regle vivante par cle : la corriger la met a jour, elle ne se dedouble pas.
create unique index memoire_cle_vivante on public.memoire (user_id, type, lower(cle))
  where statut <> 'retiree';
create index memoire_par_statut on public.memoire (user_id, statut);

alter table public.memoire enable row level security;
create policy "Chacun lit sa memoire" on public.memoire
  for select to authenticated using (auth.uid() = user_id);
create policy "Chacun ajoute a sa memoire" on public.memoire
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Chacun corrige ou retire sa memoire" on public.memoire
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.memoire from anon;
grant select, insert, update on public.memoire to authenticated;

create table public.erreurs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  demande text not null,
  compris text,
  voulu text not null,
  -- La regle nee de cette correction.
  memoire_id bigint references public.memoire(id) on delete set null,
  surface text,
  canal text,
  created_at timestamptz not null default now()
);

create index erreurs_recentes on public.erreurs (user_id, created_at desc);

alter table public.erreurs enable row level security;
create policy "Chacun lit ses erreurs" on public.erreurs
  for select to authenticated using (auth.uid() = user_id);
create policy "Chacun note ses erreurs" on public.erreurs
  for insert to authenticated with check (auth.uid() = user_id);
revoke all on public.erreurs from anon;
grant select, insert on public.erreurs to authenticated;
