-- ============================================================
-- BUDGET EXTENDED — Correspond à la structure Annual Budget 4.0
-- Ajoute : subtype sur budget_categories, account + person sur transactions
-- Idempotent — peut être relancé sans erreur
-- ============================================================

-- Ajouter subtype à budget_categories
--   'income'  = revenu (Le Mixologue)
--   'expense' = dépense variable (Course, Restaurant…)
--   'bill'    = charge fixe (Loyé, Gaz, Internet…)
--   'savings' = épargne (Ep. Nath…)
--   'debt'    = remboursement de dette
ALTER TABLE budget_categories
  ADD COLUMN IF NOT EXISTS subtype text DEFAULT 'expense'
    CHECK (subtype IN ('income','expense','bill','savings','debt'));

-- Mettre à jour les catégories existantes de type income
UPDATE budget_categories SET subtype = 'income' WHERE type = 'income' AND subtype = 'expense';

-- Ajouter account (compte bancaire) sur les transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account text;

-- Ajouter person (Nathan / Combined / …)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS person text DEFAULT 'Nathan';

-- Index utile pour filtrer par account
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account);
