-- Un client par nom : l'import depuis le Cerveau se rejoue sans creer de doublon.
create unique index if not exists clients_user_nom_uidx
  on public.clients (user_id, lower(name));
