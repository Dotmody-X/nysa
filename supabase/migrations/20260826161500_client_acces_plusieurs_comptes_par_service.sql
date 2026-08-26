-- Un client peut avoir plusieurs comptes sur le meme service : E-Fumeur en a
-- trois sur mixo-label (Lanester, Vannes, Nantes), Dj Vap de Lokili sept, et
-- Le Mixologue six comptes internes. La contrainte d'origine, unique sur
-- (client_id, service), interdisait cette realite.
--
-- Ce qui doit rester unique, c'est le compte lui-meme : un identifiant donne
-- n'existe qu'une fois par client et par service.

alter table public.client_acces
  drop constraint if exists client_acces_client_id_service_key;

create unique index if not exists client_acces_compte_uidx
  on public.client_acces (client_id, service, lower(identifiant));
