-- Les 39 policies de public/work ciblaient le role PUBLIC, qui englobe tous les
-- roles presents et futurs (dont anon). Sans effet de securite aujourd'hui
-- (auth.uid() est NULL pour anon, donc 0 ligne), mais l'intention n'est pas
-- explicite et tout nouveau role heriterait de l'acces. On les recree sur
-- authenticated, a semantique strictement identique.
--
-- Pour les policies FOR ALL sans WITH CHECK, Postgres reutilise implicitement
-- l'expression USING comme controle d'ecriture : on la rend explicite.

create temp table _pol_snapshot on commit drop as
  select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
   where schemaname in ('public','work')
     and roles::text = '{public}';

do $$
declare r record; stmt text;
begin
  for r in select * from _pol_snapshot loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    stmt := format('create policy %I on %I.%I for %s to authenticated',
                   r.policyname, r.schemaname, r.tablename, r.cmd);

    if r.cmd <> 'INSERT' and r.qual is not null then
      stmt := stmt || format(' using (%s)', r.qual);
    end if;

    if r.cmd in ('ALL', 'UPDATE', 'INSERT') then
      stmt := stmt || format(' with check (%s)', coalesce(r.with_check, r.qual));
    end if;

    execute stmt;
  end loop;
end $$;
