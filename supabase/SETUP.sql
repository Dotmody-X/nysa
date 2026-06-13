-- ============================================================
-- NYSA — Tables manquantes (à exécuter APRÈS schema.sql)
-- Idempotent : peut être relancé sans erreur.
-- Couvre : recipe_categories (catégories de recettes) et budgets
-- (résumé mensuel lu par l'agent IA).
-- ============================================================

-- ── Catégories de recettes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  color      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recipe_categories" ON recipe_categories;
CREATE POLICY "Users manage own recipe_categories" ON recipe_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_categories_user ON recipe_categories(user_id);

-- ── Résumé budget mensuel (contexte agent IA) ───────────────
CREATE TABLE IF NOT EXISTS budgets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_month text NOT NULL,            -- format "2026-06"
  income     numeric(12,2) DEFAULT 0,
  expense    numeric(12,2) DEFAULT 0,
  notes      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date_month)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
CREATE POLICY "Users manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, date_month);
