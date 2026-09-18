-- La publication Realtime etait vide : la page Calendrier s'abonnait aux
-- changements de public.events sans jamais rien recevoir. On publie les
-- tables que l'application doit voir bouger sans rechargement — le compteur
-- du time tracker en premier, arrete depuis Discord ou depuis l'iPad.
-- La RLS s'applique aux abonnements comme aux requetes : chacun ne recoit
-- que ses lignes.
alter publication supabase_realtime add table public.time_entries;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table work.events;
