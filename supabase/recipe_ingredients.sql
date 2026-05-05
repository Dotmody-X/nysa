-- ============================================================
-- RECIPE INGREDIENTS — Detailed ingredient management
-- ============================================================

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  
  -- Ingredient info
  name text NOT NULL,
  quantity numeric(8,2) NOT NULL,        -- e.g. 200
  unit text NOT NULL,                    -- g, ml, pc, cups, etc.
  
  -- Nutrition per unit quantity
  calories_per_qty numeric(8,2),         -- calories per 100g or per unit
  protein_per_qty numeric(8,2),          -- grams
  carbs_per_qty numeric(8,2),            -- grams
  fat_per_qty numeric(8,2),              -- grams
  
  -- Shopping list integration
  shopping_item_id uuid REFERENCES shopping_items(id) ON DELETE SET NULL,
  
  -- Inventory integration
  inventory_item_name text,               -- Link to inventory item name
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users manage own recipe ingredients" ON recipe_ingredients
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user ON recipe_ingredients(user_id);

-- ============================================================
-- INVENTORY — Track pantry/freezer stock
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name text NOT NULL,
  category text,                         -- produce, proteins, pantry, etc.
  quantity numeric(8,2),
  unit text,
  expiry_date date,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own inventory" ON inventory;
CREATE POLICY "Users manage own inventory" ON inventory
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
