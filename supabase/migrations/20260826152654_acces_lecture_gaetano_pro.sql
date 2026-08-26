-- Premiere tentative : ouvrir la lecture a un second compte utilisateur via des
-- policies RLS. Abandonnee aussitot (voir la migration suivante) : l'acces devait
-- servir a un programme, qui n'a pas de session utilisateur a presenter.
-- Conservee ici pour que l'historique local corresponde a celui de la base.
do $$
declare
  t text;
  proprietaire constant uuid := 'd79794c8-ea3f-4709-8112-01ddb4b3a51d';
  invite       constant uuid := '1f38587a-b2f1-44e8-b204-2d196615c6bb';
  tables constant text[] := array[
    'clients', 'client_acces', 'imprimantes',
    'tasks', 'projects', 'time_entries',
    'project_notes', 'project_files', 'project_settings',
    'publications', 'notes', 'events',
    'product_prices', 'inventory', 'objectives_wins',
    'formation_milestones', 'integrations'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists lecture_gaetano on public.%I', t);
    execute format(
      'create policy lecture_gaetano on public.%I for select to authenticated '
      'using (user_id = %L::uuid and auth.uid() = %L::uuid)',
      t, proprietaire, invite);
  end loop;
end $$;
