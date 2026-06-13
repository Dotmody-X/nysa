# Configuration Supabase — NYSA

Recettes, planning de repas, courses et budget enregistrent leurs données dans
**Supabase**. Tant que Supabase n'est pas configuré, ces sections restent vides
et n'enregistrent rien (c'est pour ça que la planification « ne marchait pas »).

## 1. Créer le projet
1. Va sur https://supabase.com → **New project** (note bien le mot de passe DB).
2. Une fois créé : **Project Settings → API** et copie :
   - **Project URL** (ex. `https://xxxx.supabase.co`)
   - **anon public** key

## 2. Renseigner les clés
Dans `.env.local` à la racine, remplace les valeurs factices :

```
NEXT_PUBLIC_SUPABASE_URL=https://TON-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TA_CLE_ANON
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Créer les tables (SQL Editor)
Ouvre **SQL Editor** dans Supabase et exécute ces fichiers **dans cet ordre**
(copier-coller le contenu, puis *Run*). Ils sont idempotents.

1. `supabase/schema.sql`            ← tables principales + RLS
2. `supabase/recipe_ingredients.sql`
3. `supabase/activity_segments.sql`
4. `supabase/budget_extended.sql`
5. `supabase/objectives_wins.sql`
6. `supabase/SETUP.sql`             ← tables manquantes (recipe_categories, budgets)
7. `supabase/storage_setup.sql`     ← (optionnel) stockage des images

## 4. Authentification
- **Authentication → Providers → Email** : activé.
- Pour tester vite : **Authentication → Users → Add user** (email + mot de passe),
  ou inscris-toi depuis l'app.
- (Optionnel) désactive « Confirm email » en dev pour te connecter sans valider l'email.

## 5. Lancer
```
npm run dev
```
Connecte-toi via `/login`. Les données saisies (recettes, planning, courses,
budget) sont maintenant persistées et synchronisées.

---

### Tables utilisées par l'app
`recipes`, `recipe_ingredients`, `recipe_categories`, `meal_plans`,
`shopping_lists`, `shopping_items`, `budget_categories`, `transactions`,
`budgets`, `health_metrics`, `running_activities`, `activity_segments`,
`events`, `tasks`, `time_entries`, `projects`, `project_*`, `integrations`,
`objectives_wins`.

> Le **catalogue d'aliments / épices / ménager** et l'inventaire maison, eux,
> sont locaux (pas besoin de Supabase) : autocomplétion instantanée hors-ligne.
