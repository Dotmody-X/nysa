-- Une commande donne plusieurs documents : l'imprimeur facture en plusieurs
-- fois et livre en plusieurs fois. Un numero unique par commande ne tenait pas.
--
-- « etiquette_fichiers » devient « etiquette_documents » : un document porte
-- son numero, sa date et son montant, et le PDF n'est qu'une piece jointe
-- facultative. Un BL dont on n'a que le numero est une information complete.

alter table if exists public.etiquette_fichiers rename to etiquette_documents;

alter table public.etiquette_documents
  add column if not exists numero        text,
  add column if not exists date_document date,
  add column if not exists montant       numeric(10,2),
  add column if not exists notes         text;

-- Le fichier devient facultatif : on saisit souvent le numero avant de
-- recevoir le PDF, et parfois on ne le recoit jamais.
alter table public.etiquette_documents alter column filename  drop not null;
alter table public.etiquette_documents alter column file_path drop not null;

alter table public.etiquette_documents drop constraint if exists etiquette_fichiers_categorie_check;
alter table public.etiquette_documents
  add constraint etiquette_documents_categorie_check
  check (categorie in ('bat','facture','bl','devis','autre'));

-- Une ligne vide n'apprend rien : il faut au moins un numero ou un fichier.
alter table public.etiquette_documents drop constraint if exists etiquette_documents_non_vide;
alter table public.etiquette_documents
  add constraint etiquette_documents_non_vide
  check (numero is not null or file_path is not null);

-- Le numero de facture et le montant quittent la commande : ils vivent
-- desormais sur les documents, et le total se calcule. Deux endroits pour la
-- meme information, c'est un endroit de trop.
alter table public.etiquette_commandes
  drop column if exists numero_facture,
  drop column if exists montant;

alter index if exists etiquette_fichiers_cmd_idx rename to etiquette_documents_cmd_idx;
create index if not exists etiquette_documents_type_idx
  on public.etiquette_documents (commande_id, categorie);

alter policy etiquette_fichiers_proprietaire on public.etiquette_documents
  rename to etiquette_documents_proprietaire;
