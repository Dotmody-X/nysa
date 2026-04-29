-- Migration : ajout du champ groupe sur la table projects
-- À exécuter dans le SQL Editor de Supabase Dashboard

ALTER TABLE projects ADD COLUMN IF NOT EXISTS groupe TEXT;

-- Index pour les requêtes groupées
CREATE INDEX IF NOT EXISTS idx_projects_groupe ON projects(groupe);

-- Commentaire
COMMENT ON COLUMN projects.groupe IS 'Grande catégorie / marque : Le Mixologue | E-Smoker | Aeterna | Interne | Autre';
