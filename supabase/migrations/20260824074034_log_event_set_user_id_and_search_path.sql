-- work.log_event doit renseigner user_id (meme convention que work.write_digest)
-- et l'ON CONFLICT doit viser le nouvel index unique (user_id, source, external_id).
create or replace function work.log_event(
    p_brand text, p_type text, p_source text, p_title text,
    p_payload jsonb default '{}'::jsonb, p_urgency integer default 3,
    p_external_id text default null, p_occurred_at timestamptz default now())
  returns bigint
  language plpgsql
  set search_path = ''
as $$
declare v_id bigint;
begin
  insert into work.events (brand, type, source, title, payload, urgency,
                           external_id, occurred_at, user_id)
  values (nullif(p_brand,'')::work.brand_t, p_type, p_source, p_title,
          p_payload, p_urgency, p_external_id, p_occurred_at,
          coalesce(auth.uid(), 'd79794c8-ea3f-4709-8112-01ddb4b3a51d'::uuid))
  on conflict (user_id, source, external_id) where external_id is not null
  do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Ancienne surcharge a 6 arguments : meme traitement.
create or replace function work.log_event(
    p_brand text, p_type text, p_source text, p_title text,
    p_payload jsonb default '{}'::jsonb, p_urgency integer default 3)
  returns bigint
  language plpgsql
  set search_path = ''
as $$
declare v_id bigint;
begin
  insert into work.events (brand, type, source, title, payload, urgency, user_id)
  values (p_brand::work.brand_t, p_type, p_source, p_title, p_payload, p_urgency,
          coalesce(auth.uid(), 'd79794c8-ea3f-4709-8112-01ddb4b3a51d'::uuid))
  returning id into v_id;
  return v_id;
end $$;

-- mark_events_processed : la RLS s'applique desormais (invoker).
create or replace function work.mark_events_processed(p_ids bigint[])
  returns integer
  language plpgsql
  set search_path = ''
as $$
declare v_n int;
begin
  update work.events set processed = true
   where id = any(p_ids) and processed = false;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function work.log_event(text, text, text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function work.log_event(text, text, text, text, jsonb, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function work.mark_events_processed(bigint[]) from public, anon, authenticated;
