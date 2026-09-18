-- Web Push : l'iPad (ou le telephone) s'abonne depuis la PWA, et le Pi
-- envoie — nysa-mail a chaque mail depose, la passerelle quand Claude a
-- repondu. Une ligne par appareil ; l'endpoint est la cle. La cle VAPID
-- publique est lue par le client dans app_config (key = 'push'), la privee
-- ne quitte pas le Pi.
create table public.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  failures     integer not null default 0
);

alter table public.push_subscriptions enable row level security;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Le schema public accorde tout a anon par defaut : on le retire.
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
