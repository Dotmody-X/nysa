-- Les routines Claude (brief, débrief, revue, radar) écrivent leur digest par
-- execute_sql sous « set local role authenticated » + claims JWT, et appellent
-- work.write_digest(...) comme le dit leur prompt. Depuis 20260824074155,
-- l'EXECUTE était retiré à authenticated : chaque run tombait sur
-- « permission denied for function write_digest » avant de se rabattre sur un
-- autre chemin.
--
-- On le rend à authenticated. Aucun privilège nouveau : la fonction est en
-- SECURITY INVOKER, authenticated a déjà INSERT sur work.digests et la RLS
-- (auth.uid() = user_id) s'applique. Le repli coalesce(auth.uid(), <owner>)
-- ne peut pas servir à écrire chez quelqu'un d'autre : sans JWT, auth.uid()
-- est NULL et le WITH CHECK rejette la ligne. anon reste sans EXECUTE.
grant execute on function work.write_digest(text, text) to authenticated;
grant execute on function work.write_digest(text, text, jsonb) to authenticated;
