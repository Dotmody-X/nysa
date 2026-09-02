-- Reprise de l'archive Tompla / G9 : dossier de la commande et destinataire.
--
-- Les PDF pesent 305 Mo pour les seules annees 2025-2026 : ils restent sur le
-- disque, Nysa n'en garde que l'adresse - meme arbitrage que pour le dossier
-- Shop des demandes.
alter table public.etiquette_commandes
  add column if not exists dossier text,
  -- Le message part vers une personne nommee, jamais vers un service : c'est la
  -- premiere regle de communication avec ce fournisseur. Sans ce champ, la
  -- salutation ne peut pas etre correcte.
  add column if not exists contact text;

-- Le numero de commande du fournisseur est unique : il sert de cle de reprise
-- si l'import est rejoue. Index non partiel pour que « on conflict » puisse
-- l'inferer sans repeter de predicat.
drop index if exists public.etiquette_commandes_reference_uidx;
create unique index etiquette_commandes_reference_uidx
  on public.etiquette_commandes (user_id, reference);
