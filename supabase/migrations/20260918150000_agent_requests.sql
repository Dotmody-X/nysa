-- Demander quelque chose a Claude depuis l'application — l'iPad du bureau en
-- premier — sans passer par Discord. L'app depose une demande, l'agent du Pi
-- la voit arriver, la traite avec Claude Code (abonnement Max, aucun credit)
-- et ecrit la reponse dans la meme ligne. Publiee en Realtime, la ligne se
-- met a jour sur l'ecran sans rechargement.
--
-- Le schema work n'est pas expose a PostgREST : l'app et le worker passent
-- par des wrappers public, en security invoker — la RLS reste le garde-fou,
-- y compris pour le worker qui porte le JWT de l'utilisateur.

create table work.agent_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- D'ou vient la demande : 'poste' (iPad), 'web', ...
  source      text not null default 'web',
  question    text not null,
  -- Ce que l'app sait et que Claude doit savoir : { event_id, brand, ... }.
  context     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending'
              check (status in ('pending', 'running', 'done', 'error')),
  reply       text,
  error       text,
  -- Fil Claude Code utilise, pour information.
  session_id  text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  done_at     timestamptz
);

create index agent_requests_user_status
  on work.agent_requests (user_id, status, created_at);

alter table work.agent_requests enable row level security;
create policy "Users manage own agent requests" on work.agent_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on work.agent_requests to authenticated;

-- L'app depose.
create or replace function public.ask_agent(p_question text, p_context jsonb default '{}'::jsonb, p_source text default 'web')
  returns bigint
  language sql
  security invoker
  set search_path = ''
as $$
  insert into work.agent_requests (user_id, source, question, context)
  values (auth.uid(), p_source, p_question, coalesce(p_context, '{}'::jsonb))
  returning id;
$$;

-- L'app lit.
create view public.v_agent_requests as
  select id, source, question, context, status, reply, error, created_at, started_at, done_at
    from work.agent_requests
   where user_id = auth.uid();
alter view public.v_agent_requests set (security_invoker = on);
grant select on public.v_agent_requests to authenticated;

-- Le worker prend la plus ancienne demande en attente et la marque en cours,
-- en une seule transaction : deux workers ne prendraient pas la meme.
create or replace function public.agent_request_claim()
  returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  with prise as (
    select id from work.agent_requests
     where user_id = auth.uid() and status = 'pending'
     order by created_at
     limit 1
     for update skip locked
  ),
  maj as (
    update work.agent_requests r
       set status = 'running', started_at = now()
      from prise
     where r.id = prise.id
    returning r.id, r.source, r.question, r.context, r.created_at
  )
  select to_jsonb(maj) from maj;
$$;

-- Le worker rend la reponse (ou l'erreur).
create or replace function public.agent_request_finish(p_id bigint, p_reply text, p_error text default null, p_session_id text default null)
  returns void
  language sql
  security invoker
  set search_path = ''
as $$
  update work.agent_requests
     set status     = case when p_error is null then 'done' else 'error' end,
         reply      = p_reply,
         error      = p_error,
         session_id = coalesce(p_session_id, session_id),
         done_at    = now()
   where id = p_id and user_id = auth.uid();
$$;

revoke execute on function public.ask_agent(text, jsonb, text) from public, anon;
revoke execute on function public.agent_request_claim() from public, anon;
revoke execute on function public.agent_request_finish(bigint, text, text, text) from public, anon;
grant execute on function public.ask_agent(text, jsonb, text) to authenticated;
grant execute on function public.agent_request_claim() to authenticated;
grant execute on function public.agent_request_finish(bigint, text, text, text) to authenticated;

-- La reponse arrive sur l'ecran sans rechargement.
alter publication supabase_realtime add table work.agent_requests;
