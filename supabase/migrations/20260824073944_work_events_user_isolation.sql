-- F2 : work.events n'avait pas de proprietaire -> inbox globale a tous les comptes.
alter table work.events add column if not exists user_id uuid;

-- Les 160 lignes existantes appartiennent au compte principal.
update work.events set user_id = 'd79794c8-ea3f-4709-8112-01ddb4b3a51d'::uuid where user_id is null;

alter table work.events alter column user_id set default auth.uid();
alter table work.events alter column user_id set not null;
alter table work.events add constraint events_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

-- La dedup source/external_id doit etre par utilisateur, sinon l'evenement
-- d'un compte fait silencieusement disparaitre celui d'un autre (ON CONFLICT DO NOTHING).
drop index if exists work.events_source_external_uidx;
create unique index events_user_source_external_uidx
  on work.events (user_id, source, external_id) where external_id is not null;

create index if not exists events_user_pending_idx on work.events (user_id, processed, urgency);

drop policy if exists events_own on work.events;
create policy events_own on work.events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on work.events to authenticated;
