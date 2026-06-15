-- ============================================================
-- PRODUCT_PRICES — observations de prix par produit & magasin
-- Alimenté par l'import de tickets / PDF. Sert à : analyse de prix
-- (budget), coût des recettes, estimation des listes de courses.
-- Appliquer : ajouter au flux de migration ou exécuter dans Supabase SQL.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_prices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name  text NOT NULL,            -- libellé affiché
  product_key   text NOT NULL,            -- nom normalisé (recherche)
  store         text,                     -- magasin (Carrefour, Lidl…)
  quantity      numeric(10,3),            -- quantité achetée
  unit          text,                     -- g, ml, pc…
  unit_price    numeric(10,4),            -- prix par unité affichée
  total_price   numeric(10,2),            -- prix payé pour la ligne
  currency      text DEFAULT 'EUR',
  date          date NOT NULL,
  source        text DEFAULT 'receipt',   -- receipt | manual
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own product_prices" ON product_prices;
CREATE POLICY "Users manage own product_prices" ON product_prices
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_product_prices_user   ON product_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_key    ON product_prices(user_id, product_key);
CREATE INDEX IF NOT EXISTS idx_product_prices_store  ON product_prices(user_id, store);
CREATE INDEX IF NOT EXISTS idx_product_prices_date   ON product_prices(date);
