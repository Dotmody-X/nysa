-- work.add_task / work.update_task / work.add_project referencent work.tasks et
-- work.projects, qui n'existent pas (le schema work ne contient que digests,
-- events, mixes, mkt_principles, products). Ces fonctions echouent donc a
-- l'execution depuis la migration qui a deplace les taches vers public.tasks.
-- Zero reference dans le depot. On les supprime.
drop function if exists work.add_task(text, text, date, integer, text);
drop function if exists work.update_task(bigint, text, date, integer, text);
drop function if exists work.add_project(text, text, date, text);
