-- Le circuit BAT : un bon a tirer valide depuis le poste porte sa date de
-- validation. C'est sur ce champ que le mail « bon pour impression » est
-- envoye et que la commande passe en production.
alter table public.etiquette_documents
  add column if not exists valide_le timestamptz;
comment on column public.etiquette_documents.valide_le is
  'BAT : date de validation (mail « bon pour impression » envoye a l''imprimeur).';
