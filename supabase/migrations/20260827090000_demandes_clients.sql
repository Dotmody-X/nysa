-- Les demandes clients : ce qu'un magasin commande, ce qu'on lui livre, ce
-- qu'on lui facture, et le temps qu'on y a passe.
--
-- Les fichiers de travail restent dans le Dropbox (26 Go pour le seul dossier
-- Shop) : la table n'en garde que le chemin. Seuls les livrables qui meritent
-- d'etre vus dans Nysa sont televerses - visuel final, PDF de facture, brief
-- du client - dans le bucket « demandes ».

create table if not exists public.demandes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Nullable a dessein : certains dossiers du Shop n'ont pas de fiche client,
  -- et une demande orpheline vaut mieux qu'une demande perdue.
  client_id    uuid references public.clients(id) on delete set null,
  titre        text not null,
  demande      text,
  statut       text not null default 'nouvelle'
               check (statut in ('nouvelle','en_cours','en_attente','livree','facturee','annulee')),
  numero_facture text,
  montant      numeric(10,2),
  date_demande date,
  date_livraison date,
  -- Le rattachement au travail : le temps passe suit la tache ou le projet.
  task_id      uuid references public.tasks(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  dossier_dropbox text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.demande_fichiers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  demande_id uuid not null references public.demandes(id) on delete cascade,
  categorie  text not null default 'autre'
             check (categorie in ('visuel','facture','brief','autre')),
  filename   text not null,
  file_path  text not null,
  file_size  integer,
  file_type  text,
  created_at timestamptz not null default now()
);

create index if not exists demandes_user_idx        on public.demandes (user_id);
create index if not exists demandes_client_idx      on public.demandes (client_id);
create index if not exists demandes_task_idx        on public.demandes (task_id);
create index if not exists demandes_projet_idx      on public.demandes (project_id);
create index if not exists demande_fichiers_dem_idx on public.demande_fichiers (demande_id);

alter table public.demandes         enable row level security;
alter table public.demande_fichiers enable row level security;

drop policy if exists demandes_proprietaire         on public.demandes;
drop policy if exists demande_fichiers_proprietaire on public.demande_fichiers;

create policy demandes_proprietaire on public.demandes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy demande_fichiers_proprietaire on public.demande_fichiers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cle de rapprochement des noms : minuscules, sans accents ni ponctuation.
-- Sert a rattacher un dossier du Shop a sa fiche client.
create or replace function public.cle_nom(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(regexp_replace(
           translate(coalesce(t,''),
                     'àâäáéèêëíîïóôöúùûüçñÀÂÄÁÉÈÊËÍÎÏÓÔÖÚÙÛÜÇÑ',
                     'aaaaeeeeiiiooouuucnAAAAEEEEIIIOOOUUUCN'),
           '[^a-zA-Z0-9]', '', 'g'))
$$;
