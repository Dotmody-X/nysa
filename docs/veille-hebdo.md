# Veille hebdomadaire — contrat de dépôt

Deux tâches planifiées tournent le lundi matin et écrivent dans Supabase
(projet `teqsxzfslpxejncrkudz`, schéma `work`). Nysa les lit dans l'onglet
**Radar → Veille e-Smoker / Veille Aeterna**. Ce fichier décrit ce que la
tâche doit déposer, et donne un prompt de départ ; le prompt lui-même vit dans
l'outil de planification.

| Marque | Sujet | `brand` | `kind` du récit |
|---|---|---|---|
| The e-Smoker | Lois sur la cigarette électronique en BE, FR, LU, CH, IT (+ UE), marché, tendances | `E-Smoker` | `veille_esmoker` |
| Aeterna | Bijoux : tendances, marché, actualité | `Aeterna` | `veille_aeterna` |

`<user_id>` est l'UUID du compte Nysa — le même que sur les lignes `radar`
de `work.digests` (`select user_id from work.digests where kind = 'radar' limit 1`).

## 1. Les éléments trouvés → `work.veille_items`

Un appel, un tableau JSON. Renvoie le nombre de lignes insérées ; une URL déjà
connue est ignorée (ne pas s'en inquiéter : c'est la dédoublonnage).

```sql
select work.deposer_veille('<user_id>', 'E-Smoker', '[
  {
    "category": "loi",
    "country": "BE",
    "title": "Interdiction des puffs jetables confirmée par arrêté royal",
    "summary": "Deux phrases : ce qui change, et ce que ça implique pour la boutique.",
    "url": "https://www.ejustice.just.fgov.be/...",
    "source": "Moniteur belge",
    "published_at": "2026-09-15",
    "effective_at": "2027-01-01",
    "importance": 3,
    "tags": ["puff", "vente"]
  }
]'::jsonb);
```

| Champ | Obligatoire | Valeurs |
|---|---|---|
| `category` | oui | `loi` · `marche` · `tendance` · `news` |
| `country` | non | `BE` `FR` `LU` `CH` `IT` `EU` — vide pour Aeterna ou si mondial |
| `title` | oui | Une ligne, factuelle |
| `summary` | oui | Deux ou trois phrases, en français |
| `url` | non | La source primaire (texte de loi, étude, article). Sert de clé de dédoublonnage |
| `source` | non | Nom de l'éditeur : « Moniteur belge », « Légifrance », « Xerfi »… |
| `published_at` | non | `AAAA-MM-JJ` |
| `effective_at` | non | `AAAA-MM-JJ` — pour une loi, la date d'entrée en vigueur. Nysa l'affiche en tête dans « Ce qui entre en vigueur » |
| `importance` | non | `1` (défaut) · `2` important · `3` critique — 3 = change ce qu'on a le droit de vendre |
| `tags` | non | Mots courts, minuscules |

Ordre de grandeur : cinq à quinze éléments par semaine. Ne pas redéposer ce
qui n'a pas changé : le journal est cumulatif.

## 2. Le récit de la semaine → `work.digests`

Même payload que le brief et le radar (`hooks/useDigests.ts`,
`DigestPayload`). `content` est le repli markdown, `payload` la version rendue.

```sql
insert into work.digests (kind, content, payload, user_id)
values (
  'veille_esmoker',
  '## Résumé ... (markdown, secours)',
  '{
    "v": 1,
    "date": "2026-09-21",
    "title": "Veille e-Smoker — semaine du 21/09",
    "headline": "Une phrase : la chose à retenir cette semaine.",
    "stats": [
      { "label": "Nouveautés", "value": 8 },
      { "label": "Lois", "value": 3, "tone": "warning" },
      { "label": "Pays touchés", "value": "BE · FR" }
    ],
    "flags": [
      { "tone": "danger", "text": "La France interdit ... au 1er janvier : vérifier le stock." }
    ],
    "sections": [
      { "icon": "gavel",          "title": "Réglementation par pays", "items": [ { "text": "...", "badge": "BE", "tone": "warning" } ] },
      { "icon": "chart-bar",      "title": "Marché",                   "items": [ { "text": "..." } ] },
      { "icon": "trending-up",    "title": "Tendances",                "items": [ { "text": "..." } ] },
      { "icon": "alert-triangle", "title": "Ce qui menace la boutique","items": [ { "text": "..." } ] },
      { "icon": "checklist",      "title": "Trois choses à faire",     "items": [ { "text": "..." } ] }
    ]
  }'::jsonb,
  '<user_id>'
);
```

`tone` ∈ `neutral` · `success` · `warning` · `danger` · `accent`. Icônes
connues : voir `lib/digestStyle.ts` (`gavel`, `chart-bar`, `trending-up`,
`alert-triangle`, `checklist`, `calendar`, `book`, `history`, `radar`…).

## Ce que Nysa en fait

- Le récit de la semaine en tête (carte éditoriale, comme le Brief).
- « Ce qui entre en vigueur » : les lois dont `effective_at` est à venir, par date.
- Le journal filtrable par catégorie (et par pays pour e-Smoker), groupé par
  semaine de dépôt.

## Prompts de départ

Les deux tâches : lundi 07:00, accès web + connecteur Supabase. Remplacer
`<user_id>`.

### Veille e-Smoker

> Tu es la veille hebdomadaire de The e-Smoker, boutique de cigarettes
> électroniques en Belgique. Cherche sur le web ce qui a changé **depuis lundi
> dernier** sur : (1) la réglementation de la cigarette électronique et des
> produits de vapotage en Belgique, France, Luxembourg, Suisse, Italie et au
> niveau de l'Union européenne — textes adoptés, projets, arrêtés, taxes,
> arômes, puffs, vente en ligne, publicité ; (2) le marché — études, chiffres,
> mouvements des grands acteurs ; (3) les tendances produits et consommateurs.
> Privilégie les sources primaires (Moniteur belge, Légifrance, Journal
> officiel du Luxembourg, Fedlex, Gazzetta Ufficiale, EUR-Lex) et les études
> sérieuses. Ne reprends pas ce qui n'a pas changé.
>
> Dépose ensuite dans Supabase (projet teqsxzfslpxejncrkudz), en suivant
> exactement `docs/veille-hebdo.md` du dépôt Nysa : d'abord chaque élément
> avec `work.deposer_veille('<user_id>', 'E-Smoker', [...])`, puis le récit
> de la semaine dans `work.digests` avec `kind = 'veille_esmoker'`. Dans le
> récit, dis ce que ça implique pour la boutique, et termine par trois
> choses à faire.

### Veille Aeterna

> Tu es la veille hebdomadaire d'Aeterna, marque de bijoux. Cherche sur le
> web ce qui a changé **depuis lundi dernier** : tendances bijoux et joaillerie
> (matières, formes, couleurs, ce que portent les gens), études et chiffres
> de marché (Europe, Belgique, France), actualité des marques et enseignes,
> évolutions réglementaires utiles (poinçons, métaux, nickel, étiquetage,
> vente en ligne). Privilégie les sources sérieuses ; ne reprends pas ce qui
> n'a pas changé.
>
> Dépose ensuite dans Supabase (projet teqsxzfslpxejncrkudz), en suivant
> exactement `docs/veille-hebdo.md` du dépôt Nysa : d'abord chaque élément
> avec `work.deposer_veille('<user_id>', 'Aeterna', [...])` (sans `country`
> sauf si c'est propre à un pays), puis le récit de la semaine dans
> `work.digests` avec `kind = 'veille_aeterna'`. Dans le récit, dis ce que
> ça implique pour la marque, et termine par trois choses à faire.
