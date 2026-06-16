-- ============================================================
-- APP_CONFIG — réglages globaux du site (feature flags, annonce,
-- maintenance). Lisible par tout utilisateur connecté ; écrit
-- uniquement par les routes admin (service_role, qui bypass la RLS).
-- Appliquer dans le SQL Editor de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Lecture par tout utilisateur authentifié (les clients lisent les flags)
DROP POLICY IF EXISTS "app_config readable" ON app_config;
CREATE POLICY "app_config readable" ON app_config
  FOR SELECT TO authenticated USING (true);

-- Aucune policy d'écriture : seules les routes admin (service_role) écrivent.

-- Ligne par défaut
INSERT INTO app_config (key, value)
VALUES ('site', '{"hiddenSections":[],"announcement":{"text":"","active":false},"maintenance":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
