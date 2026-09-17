-- Le radar mensuel (premier lundi) et la revue hebdomadaire (vendredi) sont
-- deposes dans work.digests depuis aout, mais public.v_digests ne laissait
-- passer que brief et debrief : l'application ne pouvait pas les afficher.
-- On elargit la fenetre ; le filtre user_id = auth.uid() reste tel quel.
create or replace view public.v_digests as
  select id, kind, content, generated_at, payload
    from work.digests
   where kind = any (array['brief', 'debrief', 'radar', 'review'])
     and user_id = auth.uid();

-- CREATE OR REPLACE reinitialise les reloptions : on remet security_invoker
-- apres, comme dans 20260824074014.
alter view public.v_digests set (security_invoker = on);
