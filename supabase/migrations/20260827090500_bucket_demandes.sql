-- Premier bucket de stockage du projet. Prive : les visuels et les factures
-- clients ne sont pas des donnees publiques, ils s'atteignent par une URL
-- signee, valable une heure.
--
-- Convention de chemin : {user_id}/{demande_id}/{fichier}. Le premier segment
-- porte l'isolation - c'est sur lui que les policies filtrent, comme
-- user_id = auth.uid() le fait sur les tables.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demandes', 'demandes', false, 26214400,
        array['image/png','image/jpeg','image/webp','image/gif','image/heic',
              'application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists demandes_fichiers_lecture on storage.objects;
drop policy if exists demandes_fichiers_depot   on storage.objects;
drop policy if exists demandes_fichiers_maj     on storage.objects;
drop policy if exists demandes_fichiers_retrait on storage.objects;

create policy demandes_fichiers_lecture on storage.objects
  for select to authenticated
  using (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy demandes_fichiers_depot on storage.objects
  for insert to authenticated
  with check (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy demandes_fichiers_maj on storage.objects
  for update to authenticated
  using (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy demandes_fichiers_retrait on storage.objects
  for delete to authenticated
  using (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);
