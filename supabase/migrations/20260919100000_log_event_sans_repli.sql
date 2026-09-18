-- work.log_event portait en dur l'UUID du compte principal comme repli quand
-- auth.uid() etait nul — l'epoque ou n8n ecrivait avec la cle anon. Plus
-- personne n'ecrit sans session : nysa-mail depose sous une identite
-- authentifiee. Sans session, on refuse, on ne devine plus.
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
  if auth.uid() is null then
    raise exception 'log_event : aucune session (auth.uid() est nul)';
  end if;
  insert into work.events (brand, type, source, title, payload, urgency,
                           external_id, occurred_at, user_id)
  values (nullif(p_brand, '')::work.brand_t, p_type, p_source, p_title,
          p_payload, p_urgency, p_external_id, p_occurred_at, auth.uid())
  on conflict (user_id, source, external_id) where external_id is not null
  do nothing
  returning id into v_id;
  return v_id;
end $$;

-- L'ancienne surcharge a six arguments n'a plus d'appelant.
drop function if exists work.log_event(text, text, text, text, jsonb, integer);
