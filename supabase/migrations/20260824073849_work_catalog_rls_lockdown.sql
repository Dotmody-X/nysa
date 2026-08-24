-- F4 : work.products et work.mixes n'ont pas de colonne proprietaire et
-- n'ont aucun GRANT anon/authenticated. On active la RLS sans policy : le
-- comportement actuel est preserve a l'identique (acces service_role
-- uniquement, qui bypass la RLS), mais un GRANT ajoute par megarde ou une
-- future vue SECURITY DEFINER ne les exposera plus globalement.
alter table work.products enable row level security;
alter table work.mixes    enable row level security;
