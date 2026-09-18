-- Veille hebdomadaire du lundi, pour deux marques : The e-Smoker (lois sur la
-- cigarette electronique en BE/FR/LU/CH/IT, marche, tendances) et Aeterna
-- (bijoux : tendances, marche, actualite).
--
-- Deux niveaux, comme le radar : le RECIT de la semaine va dans work.digests
-- (kind veille_esmoker / veille_aeterna, meme payload que brief et radar), et
-- chaque element trouve — une loi, une etude, un article — devient une ligne
-- de work.veille_items, pour que ca s'accumule et se filtre dans Nysa au lieu
-- de se perdre au fond d'un texte.

create table work.veille_items (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  brand        text not null check (brand in ('E-Smoker', 'Aeterna')),
  category     text not null check (category in ('loi', 'marche', 'tendance', 'news')),
  country      text check (country in ('BE', 'FR', 'LU', 'CH', 'IT', 'EU')),
  title        text not null,
  summary      text not null,
  url          text,
  source       text,
  published_at date,
  -- Pour une loi : date d'entree en vigueur, quand elle est connue.
  effective_at date,
  importance   smallint not null default 1 check (importance between 1 and 3),
  tags         text[] not null default '{}',
  captured_at  timestamptz not null default now()
);

-- La meme source retrouvee une autre semaine ne fait pas une deuxieme ligne.
create unique index veille_items_user_url
  on work.veille_items (user_id, url) where url is not null;
create index veille_items_user_brand_captured
  on work.veille_items (user_id, brand, captured_at desc);

alter table work.veille_items enable row level security;
create policy "Users manage own veille" on work.veille_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select on work.veille_items to authenticated;

-- Le schema work n'est pas expose a PostgREST : le front lit par une vue
-- public, invoker + RLS, comme v_digests.
create view public.v_veille_items as
  select id, brand, category, country, title, summary, url, source,
         published_at, effective_at, importance, tags, captured_at
    from work.veille_items
   where user_id = auth.uid();
alter view public.v_veille_items set (security_invoker = on);
grant select on public.v_veille_items to authenticated;

-- Depot en un appel pour la tache planifiee, qui ecrit en postgres (pas de
-- auth.uid()) : elle passe l'utilisateur et un tableau JSON d'elements.
-- Renvoie le nombre de lignes reellement inserees (les doublons d'URL sont
-- ignores). Pas d'EXECUTE pour anon/authenticated : ce n'est pas une API.
create or replace function work.deposer_veille(p_user uuid, p_brand text, p_items jsonb)
  returns integer
  language sql
  set search_path = ''
as $$
  with ins as (
    insert into work.veille_items
      (user_id, brand, category, country, title, summary, url, source,
       published_at, effective_at, importance, tags)
    select p_user, p_brand,
           i->>'category',
           nullif(i->>'country', ''),
           i->>'title',
           i->>'summary',
           nullif(i->>'url', ''),
           nullif(i->>'source', ''),
           (nullif(i->>'published_at', ''))::date,
           (nullif(i->>'effective_at', ''))::date,
           coalesce((i->>'importance')::smallint, 1),
           coalesce(array(select jsonb_array_elements_text(i->'tags')), '{}'::text[])
      from jsonb_array_elements(p_items) i
    on conflict (user_id, url) where url is not null do nothing
    returning 1
  )
  select count(*)::int from ins;
$$;
revoke execute on function work.deposer_veille(uuid, text, jsonb) from public, anon, authenticated;

-- Le recit hebdomadaire passe par la vue des digests.
create or replace view public.v_digests as
  select id, kind, content, generated_at, payload
    from work.digests
   where kind = any (array['brief', 'debrief', 'radar', 'review', 'veille_esmoker', 'veille_aeterna'])
     and user_id = auth.uid();
alter view public.v_digests set (security_invoker = on);
