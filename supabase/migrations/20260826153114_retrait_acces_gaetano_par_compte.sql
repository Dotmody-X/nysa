-- Annule la migration precedente : l'acces passera par un role machine, pas par
-- un compte utilisateur. Une autorisation inutilisee est une autorisation qu'on
-- oublie de revoquer, donc on l'enleve plutot que de la laisser dormir.
do $$
declare t text;
begin
  for t in
    select tablename from pg_policies
     where schemaname = 'public' and policyname = 'lecture_gaetano'
  loop
    execute format('drop policy if exists lecture_gaetano on public.%I', t);
  end loop;
end $$;
