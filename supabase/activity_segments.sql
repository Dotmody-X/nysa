-- ============================================================
-- ACTIVITY SEGMENTS — Détails km par km (Strava streams)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES running_activities(id) ON DELETE CASCADE NOT NULL,
  
  -- Position dans l'activité
  km_index integer NOT NULL,           -- 0, 1, 2, etc.
  km_start numeric(8,3) NOT NULL,      -- distance en km au début du segment
  km_end numeric(8,3) NOT NULL,        -- distance en km à la fin du segment
  
  -- Temps
  time_seconds integer NOT NULL,       -- durée du segment en secondes
  
  -- Altitude & D+
  altitude_start integer,
  altitude_end integer,
  elevation_gain integer,               -- D+ pour ce km
  
  -- Allure
  pace_sec_per_km numeric(6,2),        -- secondes par km pour ce segment
  
  -- Fréquence cardiaque
  heart_rate_avg integer,
  heart_rate_min integer,
  heart_rate_max integer,
  
  -- Cadence (RPM)
  cadence_avg integer,
  
  -- Puissance (Watts)
  power_avg integer,
  
  -- Température
  temperature_avg integer,
  
  -- Pente
  grade_avg numeric(6,2),              -- pente moyenne %
  
  -- Géolocalisation
  lat_start numeric(10,6),
  lon_start numeric(10,6),
  lat_end numeric(10,6),
  lon_end numeric(10,6),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(activity_id, km_index)
);

ALTER TABLE activity_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own segments" ON activity_segments;
CREATE POLICY "Users access own segments" ON activity_segments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_segments_activity ON activity_segments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_segments_user ON activity_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_segments_km ON activity_segments(activity_id, km_index);
