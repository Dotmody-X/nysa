-- Un service du Pi (nysa-mail) agit au nom du proprietaire avec sa propre
-- identite et son propre refresh token : Supabase fait tourner les jetons,
-- deux processus ne peuvent pas se partager celui de la passerelle Discord.
alter table public.bot_identities drop constraint if exists bot_identities_provider_check;
alter table public.bot_identities
  add constraint bot_identities_provider_check check (provider in ('discord', 'telegram', 'service'));
