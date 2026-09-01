-- « Passee » s'intercale entre la confirmation interne et la production :
-- confirmee = j'ai arrete le contenu, passee = c'est parti chez l'imprimeur.
-- Entre les deux il se passe parfois des jours, et l'un n'engage pas l'autre.

alter table public.etiquette_commandes drop constraint if exists etiquette_commandes_statut_check;
alter table public.etiquette_commandes
  add constraint etiquette_commandes_statut_check
  check (statut in ('brouillon','confirmee','passee','en_production','recue','annulee'));

-- Le fichier part avec la commande : la bascule doit se declencher au premier
-- des deux etats qui signifient « c'est engage », et une seule fois. La
-- condition d'origine ne regardait que « confirmee », donc une commande passee
-- directement en « passee » laissait ses etiquettes en « modifie ».
create or replace function public.etiquettes_marquer_changement_envoye()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.statut not in ('confirmee','passee')
     or coalesce(old.statut, '') in ('confirmee','passee','en_production','recue') then
    return new;
  end if;

  update public.etiquette_commande_lignes l
     set fichier_envoye = true
    from public.etiquettes e
   where l.commande_id = new.id and e.id = l.etiquette_id and e.etat_fichier = 'modifie';

  update public.etiquettes e
     set etat_fichier = 'changement_envoye',
         derniere_commande = coalesce(new.date_commande, current_date), updated_at = now()
   where e.etat_fichier = 'modifie'
     and e.id in (select l.etiquette_id from public.etiquette_commande_lignes l
                   where l.commande_id = new.id);

  update public.etiquettes e
     set derniere_commande = coalesce(new.date_commande, current_date), updated_at = now()
   where e.etat_fichier <> 'modifie'
     and e.id in (select l.etiquette_id from public.etiquette_commande_lignes l
                   where l.commande_id = new.id);

  return new;
end $$;
