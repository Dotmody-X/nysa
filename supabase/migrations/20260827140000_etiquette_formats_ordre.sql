-- L'ordre d'affichage des formats dans leur gamme.
--
-- L'ordre alphabetique de la contenance n'a aucun sens ici : « 120 ml » y passe
-- avant « 30 ml ». C'est a l'usage de decider, pas au tri des chaines.

alter table public.etiquette_formats
  add column if not exists ordre integer not null default 0;

-- Ordre de depart par volume croissant, dix par dix pour laisser de la place
-- a une insertion manuelle.
with numerotes as (
  select id,
         row_number() over (
           partition by gamme_id
           order by nullif(regexp_replace(contenance, '[^0-9]', '', 'g'), '')::int nulls last,
                    variante nulls first
         ) * 10 as rang
    from public.etiquette_formats
)
update public.etiquette_formats f
   set ordre = n.rang, updated_at = now()
  from numerotes n where n.id = f.id;

create index if not exists etiquette_formats_ordre_idx
  on public.etiquette_formats (gamme_id, ordre);
