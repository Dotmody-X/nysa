-- La veille sur les lois de la cigarette electronique (BE, FR, LU, CH, IT)
-- est celle du Mixologue — marque d'e-liquides distribuee dans ces pays —
-- et non de The e-Smoker, pour qui Nathan ne travaille presque jamais.
-- La table est encore vide : on corrige la contrainte et le kind du recit.
alter table work.veille_items drop constraint veille_items_brand_check;
alter table work.veille_items
  add constraint veille_items_brand_check check (brand in ('Le Mixologue', 'Aeterna'));

create or replace view public.v_digests as
  select id, kind, content, generated_at, payload
    from work.digests
   where kind = any (array['brief', 'debrief', 'radar', 'review', 'veille_mixologue', 'veille_aeterna'])
     and user_id = auth.uid();
alter view public.v_digests set (security_invoker = on);
