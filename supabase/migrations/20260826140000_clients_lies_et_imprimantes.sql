-- Rattachement d'un client aux taches et au suivi du temps.
-- projects.client_id existait deja : on aligne les deux autres.
alter table public.tasks
  add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.time_entries
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists tasks_client_idx        on public.tasks (client_id)        where client_id is not null;
create index if not exists time_entries_client_idx on public.time_entries (client_id) where client_id is not null;

-- Le parc d'imprimantes mises a disposition des magasins.
create table if not exists public.imprimantes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  client_id          uuid references public.clients(id) on delete set null,
  -- Nom tel qu'il figure sur la liste d'origine : il subsiste meme quand
  -- aucun client n'a encore ete rattache, sinon la ligne devient anonyme.
  magasin            text not null,
  modele             text not null default 'Brother QL-800',
  serial             text,
  adresse            text,
  date_mise_a_dispo  date,
  statut             text not null default 'en_service'
                     check (statut in ('demandee','commandee','envoyee','en_service','retournee','hors_service')),
  nombre             integer not null default 1 check (nombre > 0),
  document_signe     boolean not null default false,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.imprimantes enable row level security;
drop policy if exists imprimantes_own on public.imprimantes;
create policy imprimantes_own on public.imprimantes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.imprimantes to authenticated;
revoke all on public.imprimantes from anon;

create index if not exists imprimantes_client_idx on public.imprimantes (client_id);
create index if not exists imprimantes_serial_idx on public.imprimantes (serial) where serial is not null;

-- Acces au site d'etiquettes, table separee plutot que colonnes sur clients :
-- la liste des clients est affichee partout, ces identifiants ne doivent pas
-- voyager avec elle. Un magasin a un compte, meme s'il a plusieurs imprimantes.
create table if not exists public.client_acces (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  client_id                 uuid not null references public.clients(id) on delete cascade,
  service                   text not null default 'site-etiquettes',
  identifiant               text,
  motdepasse                text,
  date_creation             date,
  mail_identifiants_envoye  boolean not null default false,
  mail_mise_a_dispo_envoye  boolean not null default false,
  mail_installation_envoye  boolean not null default false,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (client_id, service)
);

alter table public.client_acces enable row level security;
drop policy if exists client_acces_own on public.client_acces;
create policy client_acces_own on public.client_acces
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.client_acces to authenticated;
revoke all on public.client_acces from anon;

-- clients n'avait pas de quoi identifier un magasin au-dela du nom.
alter table public.clients add column if not exists ville      text;
alter table public.clients add column if not exists pays       text;
alter table public.clients add column if not exists adresse    text;
alter table public.clients add column if not exists vendeur    text;
alter table public.clients add column if not exists statut     text not null default 'actif'
  check (statut in ('actif','inactif','prospect','archive'));
alter table public.clients add column if not exists updated_at timestamptz not null default now();
