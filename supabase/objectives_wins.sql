-- ============================================================
-- OBJECTIVES WINS — Track when objectives are achieved
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Objective type
  objective_type text NOT NULL CHECK (objective_type IN ('km', 'seances', 'elevation')),
  
  -- Level achieved
  level integer NOT NULL DEFAULT 1,
  
  -- Target value for this level
  target_value numeric(8,2) NOT NULL,
  
  -- Achieved on this date
  achieved_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE objectives_wins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own objective wins" ON objectives_wins;
CREATE POLICY "Users manage own objective wins" ON objectives_wins
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_objectives_wins_user ON objectives_wins(user_id);
CREATE INDEX IF NOT EXISTS idx_objectives_wins_type ON objectives_wins(user_id, objective_type);
