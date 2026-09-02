-- Retrait des sections Running, Health, Recettes, Courses et Budget.
--
-- Nysa se recentre sur le travail : taches, temps, projets, clients, demandes,
-- imprimantes et etiquettes. Le suivi personnel sort du perimetre.
--
-- Suppression definitive et assumee : 195 sorties de running, 1 527 segments,
-- 3 recettes, 24 articles de courses, 42 categories de budget, 2 mesures de
-- sante. Confirmee explicitement avant execution.

drop table if exists public.activity_segments   cascade;
drop table if exists public.running_activities  cascade;
drop table if exists public.training_plans      cascade;
drop table if exists public.health_metrics      cascade;

drop table if exists public.recipe_ingredients  cascade;
drop table if exists public.meal_plans          cascade;
drop table if exists public.recipes             cascade;
drop table if exists public.recipe_categories   cascade;

drop table if exists public.shopping_items      cascade;
drop table if exists public.shopping_lists      cascade;

drop table if exists public.transactions        cascade;
drop table if exists public.budgets             cascade;
drop table if exists public.budget_categories   cascade;
