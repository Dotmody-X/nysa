-- Les etiquettes : ce qu'on fait imprimer, dans quel format, pour quelle gamme.
--
-- Trois niveaux : une gamme porte des formats, un format porte des etiquettes
-- (une par saveur). C'est l'etiquette qui sait si l'imprimeur detient ou non
-- le fichier a jour - la question se pose saveur par saveur, un visuel pouvant
-- changer sans que le reste du format bouge.

create table if not exists public.etiquette_gammes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null, ordre integer not null default 0,
  actif boolean not null default true, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists etiquette_gammes_nom_uidx
  on public.etiquette_gammes (user_id, lower(nom));

create table if not exists public.etiquette_formats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gamme_id uuid not null references public.etiquette_gammes(id) on delete cascade,
  contenance text not null,
  -- Une meme contenance existe parfois en deux declinaisons : le 75 ml M Glace
  -- avec ou sans livret, le 30 ml FR en blanc de soutien ou en PP blanc.
  variante text, dimensions text, specification text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists etiquette_formats_gamme_idx on public.etiquette_formats (gamme_id);

create table if not exists public.etiquettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.etiquette_formats(id) on delete cascade,
  saveur text not null,
  -- L'imprimeur conserve nos fichiers : on ne lui renvoie que ce qui a change.
  --   a_jour            il a la bonne version, ne rien envoyer
  --   modifie           le visuel a change depuis, A ENVOYER a la prochaine commande
  --   changement_envoye le nouveau fichier est parti avec une commande
  etat_fichier text not null default 'a_jour'
    check (etat_fichier in ('a_jour','modifie','changement_envoye')),
  date_modification date, derniere_commande date, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists etiquettes_saveur_uidx
  on public.etiquettes (format_id, lower(saveur));
create index if not exists etiquettes_etat_idx on public.etiquettes (user_id, etat_fichier);

create table if not exists public.etiquette_commandes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text, imprimeur text,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','confirmee','en_production','recue','annulee')),
  date_commande date, date_reception date,
  numero_facture text, montant numeric(10,2), notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.etiquette_commande_lignes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commande_id uuid not null references public.etiquette_commandes(id) on delete cascade,
  etiquette_id uuid not null references public.etiquettes(id) on delete cascade,
  quantite integer not null check (quantite > 0),
  -- Trace figee : le fichier est-il parti avec cette commande. Sert a relire
  -- l'historique meme apres que l'etiquette est repassee a jour.
  fichier_envoye boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists etiquette_lignes_cmd_idx on public.etiquette_commande_lignes (commande_id);
create unique index if not exists etiquette_lignes_uidx
  on public.etiquette_commande_lignes (commande_id, etiquette_id);

create table if not exists public.etiquette_fichiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commande_id uuid not null references public.etiquette_commandes(id) on delete cascade,
  categorie text not null default 'autre' check (categorie in ('bat','facture','autre')),
  filename text not null, file_path text not null,
  file_size integer, file_type text,
  created_at timestamptz not null default now()
);
create index if not exists etiquette_fichiers_cmd_idx on public.etiquette_fichiers (commande_id);

do $$
declare t text;
begin
  foreach t in array array['etiquette_gammes','etiquette_formats','etiquettes',
                           'etiquette_commandes','etiquette_commande_lignes','etiquette_fichiers']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_proprietaire on public.%I', t, t);
    execute format(
      'create policy %I_proprietaire on public.%I for all to authenticated '
      'using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end $$;
