-- Le mail entier et ses pieces jointes.
--
-- nysa-mail garde desormais le texte complet du message (payload.text) et
-- depose les pieces jointes dans un bucket prive `courrier`, sous
-- {user_id}/{event_id}/{fichier}. La liste des fichiers va dans
-- payload.files. Les pubs classees par Claude s'archivent seules apres 24 h.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('courrier', 'courrier', false, 15728640,
        array['application/pdf','image/png','image/jpeg','image/webp','image/gif','image/heic',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword',
              'text/csv','text/plain'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists courrier_fichiers_lecture on storage.objects;
drop policy if exists courrier_fichiers_depot   on storage.objects;
drop policy if exists courrier_fichiers_retrait on storage.objects;

create policy courrier_fichiers_lecture on storage.objects
  for select to authenticated
  using (bucket_id = 'courrier' and (storage.foldername(name))[1] = auth.uid()::text);
create policy courrier_fichiers_depot on storage.objects
  for insert to authenticated
  with check (bucket_id = 'courrier' and (storage.foldername(name))[1] = auth.uid()::text);
create policy courrier_fichiers_retrait on storage.objects
  for delete to authenticated
  using (bucket_id = 'courrier' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fusionner un morceau de payload (files, sent...) sous RLS.
create or replace function public.merge_work_event_payload(p_id bigint, p_patch jsonb)
  returns void
  language sql
  security invoker
  set search_path = ''
as $$
  update work.events
     set payload = payload || coalesce(p_patch, '{}'::jsonb)
   where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.merge_work_event_payload(bigint, jsonb) from public, anon;
grant execute on function public.merge_work_event_payload(bigint, jsonb) to authenticated;

-- Les pubs et spams reconnus par Claude sortent de l'inbox seuls apres 24 h.
-- Ils restent en base : « Voir traites » et les briefs les voient encore.
create or replace function public.archive_work_pubs(p_heures integer default 24)
  returns integer
  language sql
  security invoker
  set search_path = ''
as $$
  with maj as (
    update work.events
       set processed = true
     where user_id = auth.uid()
       and processed = false
       and payload -> 'ai' ->> 'categorie' in ('pub', 'spam')
       and occurred_at < now() - make_interval(hours => p_heures)
    returning 1
  )
  select count(*)::int from maj;
$$;
revoke execute on function public.archive_work_pubs(integer) from public, anon;
grant execute on function public.archive_work_pubs(integer) to authenticated;

-- La vue de l'inbox et le courrier recent portent le texte et les fichiers.
create or replace view work.v_inbox as
  select id, brand, type, source, title,
         payload ->> 'from' as expediteur,
         urgency, occurred_at,
         round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
         payload ->> 'snippet' as extrait,
         payload ->> 'mailbox' as boite,
         coalesce((payload ->> 'attachments')::int, 0) as pieces,
         payload -> 'ai' as ai,
         payload ->> 'text' as texte,
         payload -> 'files' as fichiers
    from work.events
   where processed = false
   order by urgency, occurred_at desc;
alter view work.v_inbox set (security_invoker = on);

create or replace function public.get_work_courrier(p_jours integer default 7)
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.occurred_at desc), '[]'::jsonb)
    from (
      select id, brand, type, source, title,
             payload ->> 'from' as expediteur,
             urgency, occurred_at, processed,
             round(extract(epoch from now() - occurred_at) / 3600::numeric, 1) as heures,
             payload ->> 'snippet' as extrait,
             payload ->> 'mailbox' as boite,
             coalesce((payload ->> 'attachments')::int, 0) as pieces,
             payload -> 'ai' as ai,
             payload ->> 'text' as texte,
             payload -> 'files' as fichiers
        from work.events
       where user_id = auth.uid()
         and occurred_at >= now() - make_interval(days => p_jours)
    ) e;
$$;
