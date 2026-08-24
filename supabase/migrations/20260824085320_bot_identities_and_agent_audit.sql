-- Passerelle Discord/Telegram -> compte Supabase.
-- Contient des refresh tokens : RLS active SANS policy, donc lisible par
-- service_role uniquement. Le bot ne l'utilise que pour resoudre l'identite ;
-- toutes les requetes metier passent ensuite par le JWT de l'utilisateur.
create table if not exists public.bot_identities (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null check (provider in ('discord','telegram')),
  external_id   text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  refresh_token text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  unique (provider, external_id)
);
alter table public.bot_identities enable row level security;

-- Journal des actions de l'agent. L'agent etant totalement autonome (aucune
-- confirmation), c'est ce qui rend ses ecritures rattrapables : on conserve
-- l'etat avant/apres de chaque modification.
create table if not exists public.agent_audit_log (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at       timestamptz not null default now(),
  surface  text not null,
  channel  text,
  tool     text not null,
  args     jsonb not null default '{}'::jsonb,
  before   jsonb,
  after    jsonb,
  ok       boolean not null default true,
  error    text
);
alter table public.agent_audit_log enable row level security;

drop policy if exists agent_audit_own on public.agent_audit_log;
create policy agent_audit_own on public.agent_audit_log
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert on public.agent_audit_log to authenticated;

create index if not exists agent_audit_user_at_idx on public.agent_audit_log (user_id, at desc);
