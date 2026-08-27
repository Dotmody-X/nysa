-- A la confirmation d'une commande, toute etiquette dont le fichier avait
-- change passe en « changement envoye » : le nouveau fichier part avec la
-- commande, l'imprimeur detient desormais la bonne version.
--
-- Cote base et non cote interface : la regle doit tenir quel que soit l'endroit
-- d'ou la commande est confirmee - ecran Nysa, agent Discord, ou SQL direct.

create or replace function public.etiquettes_marquer_changement_envoye()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Ne se declenche qu'au passage en « confirmee », pas a chaque mise a jour.
  if new.statut <> 'confirmee' or coalesce(old.statut, '') = 'confirmee' then
    return new;
  end if;

  -- Trace figee sur la ligne : on saura, des annees apres, que le fichier
  -- est parti avec cette commande-la.
  update public.etiquette_commande_lignes l
     set fichier_envoye = true
    from public.etiquettes e
   where l.commande_id = new.id and e.id = l.etiquette_id and e.etat_fichier = 'modifie';

  update public.etiquettes e
     set etat_fichier = 'changement_envoye',
         derniere_commande = coalesce(new.date_commande, current_date),
         updated_at = now()
   where e.etat_fichier = 'modifie'
     and e.id in (select l.etiquette_id from public.etiquette_commande_lignes l
                   where l.commande_id = new.id);

  -- Les autres lignes ne changent pas d'etat, mais datent leur commande.
  update public.etiquettes e
     set derniere_commande = coalesce(new.date_commande, current_date), updated_at = now()
   where e.etat_fichier <> 'modifie'
     and e.id in (select l.etiquette_id from public.etiquette_commande_lignes l
                   where l.commande_id = new.id);

  return new;
end $$;

drop trigger if exists etiquettes_changement_envoye on public.etiquette_commandes;
create trigger etiquettes_changement_envoye
  after update of statut on public.etiquette_commandes
  for each row execute function public.etiquettes_marquer_changement_envoye();

-- Bucket des BAT et des factures. Meme convention que « demandes » :
-- {user_id}/{commande_id}/{fichier}, le premier segment portant l'isolation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('etiquettes', 'etiquettes', false, 52428800,
        array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists etiquettes_fichiers_lecture on storage.objects;
drop policy if exists etiquettes_fichiers_depot   on storage.objects;
drop policy if exists etiquettes_fichiers_retrait on storage.objects;

create policy etiquettes_fichiers_lecture on storage.objects
  for select to authenticated
  using (bucket_id = 'etiquettes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy etiquettes_fichiers_depot on storage.objects
  for insert to authenticated
  with check (bucket_id = 'etiquettes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy etiquettes_fichiers_retrait on storage.objects
  for delete to authenticated
  using (bucket_id = 'etiquettes' and (storage.foldername(name))[1] = auth.uid()::text);
