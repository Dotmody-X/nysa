-- F5 : search_path mutable. Critique sur les SECURITY DEFINER, ou un appelant
-- peut detourner la resolution des objets dans un contexte postgres.
alter function public.log_work_event(text, text, text, text, jsonb, integer, text, timestamptz) set search_path = '';
alter function public.mark_work_events_processed(bigint[]) set search_path = '';
alter function public.write_work_digest(text, text) set search_path = '';
alter function work.write_digest(text, text) set search_path = '';
alter function work.write_digest(text, text, jsonb) set search_path = '';

-- Fonctions trigger (corps qualifies / pg_catalog uniquement).
alter function public.update_updated_at() set search_path = '';
alter function public.notes_touch_updated_at() set search_path = '';
alter function public.publications_touch_updated_at() set search_path = '';
alter function public.formation_milestones_touch() set search_path = '';
alter function work.touch_updated_at() set search_path = '';
alter function work.mkt_principles_touch() set search_path = '';

-- work.add_task / update_task / add_project referencent work.tasks et
-- work.projects, qui n'existent pas : fonctions mortes, mais executables par
-- authenticated. On retire l'acces sans les supprimer (reversible).
revoke all on function work.add_task(text, text, date, integer, text) from public, anon, authenticated;
revoke all on function work.update_task(bigint, text, date, integer, text) from public, anon, authenticated;
revoke all on function work.add_project(text, text, date, text) from public, anon, authenticated;
