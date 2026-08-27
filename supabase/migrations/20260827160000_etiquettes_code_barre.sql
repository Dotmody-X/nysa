-- Le code-barres de chaque saveur, dans son format.
--
-- Il vit sur l'etiquette et non sur la saveur : le meme parfum porte un code
-- different en 50 ml et en 500 ml, puisque c'est le produit fini qui passe en
-- caisse, pas l'arome.
--
-- « code_barre_note » est laisse libre pour les remarques du proprietaire. Le
-- diagnostic - cle EAN valide, prefixe, doublon - n'y est pas recopie : il se
-- deduit des codes eux-memes, et le recopier le figerait a la premiere saisie.

alter table public.etiquettes
  add column if not exists code_barre      text,
  add column if not exists code_barre_note text;

-- Un EAN-13 identifie un produit : deux etiquettes ne devraient pas le
-- partager. Le releve en compte pourtant - 80 references sur un code de gamme,
-- des doublons entre marques - donc on signale sans interdire : un index
-- ordinaire, pas une contrainte d'unicite qui bloquerait la saisie.
create index if not exists etiquettes_code_barre_idx
  on public.etiquettes (user_id, code_barre) where code_barre is not null;

-- Controle de la cle EAN-13 : les douze premiers chiffres, ponderes
-- alternativement 1 et 3, doivent retrouver le treizieme. Un code dont la cle
-- est fausse ne passe pas en caisse.
create or replace function public.ean13_valide(code text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select case
    when code is null or code !~ '^[0-9]{13}$' then false
    else (10 - (
      select sum((substr(code, i, 1))::int * case when i % 2 = 0 then 3 else 1 end)
        from generate_series(1, 12) i
    ) % 10) % 10 = substr(code, 13, 1)::int
  end
$$;
