-- Le facturable disparait de Nysa : la distinction ne sert plus.
-- Aucune vue ne dependait de la colonne, verifie avant suppression.
alter table public.time_entries drop column if exists is_billable;
