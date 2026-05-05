#Modèle de données multi-ressources avec RLS (clients, projects, tâches, calendrier, santé et budget)

---

-- ============================================================
-- NYSA — Schéma Supabase / PostgreSQL
-- Idempotent : peut être relancé plusieurs fois sans erreur
-- ============================================================

-- Active l'extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 name text NOT NULL,
 company text,
 email text,
 phone text,
 notes text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own clients" ON clients;
CREATE POLICY "Users manage own clients" ON clients
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
 name text NOT NULL,
 description text,
 status text DEFAULT 'active' CHECK (status IN ('active','completed','archived','paused')),
 priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
 color text DEFAULT '#F2542D',
 budget numeric(10,2),
 deadline date,
 progress integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own projects" ON projects;
CREATE POLICY "Users manage own projects" ON projects
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
 title text NOT NULL,
 description text,
 status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
 priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
 category text,
 due_date date,
 due_time time,
 estimated_minutes integer,
 actual_minutes integer,
 is_recurring boolean DEFAULT false,
 recurrence_rule text,
 tags text[],
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(),
 completed_at timestamptz
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tasks" ON tasks;
CREATE POLICY "Users manage own tasks" ON tasks
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ============================================================
-- EVENTS (Calendrier)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
 project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
 title text NOT NULL,
 description text,
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL,
 all_day boolean DEFAULT false,
 category text,
 color text,
 location text,
 source text DEFAULT 'manual' CHECK (source IN ('manual','strava','garmin','google')),
 external_id text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own events" ON events;
CREATE POLICY "Users manage own events" ON events
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- ============================================================
-- TIME ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
 task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
 description text,
 category text,
 started_at timestamptz NOT NULL,
 ended_at timestamptz,
 duration_seconds integer,
 is_billable boolean DEFAULT true,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own time entries" ON time_entries;
CREATE POLICY "Users manage own time entries" ON time_entries
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);

-- ============================================================
-- HEALTH METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS health_metrics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 date date NOT NULL,
 weight_kg numeric(5,2),
 body_fat numeric(5,2),
 notes text,
 created_at timestamptz DEFAULT now(),
 UNIQUE(user_id, date)
);

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own health metrics" ON health_metrics;
CREATE POLICY "Users manage own health metrics" ON health_metrics
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health_metrics(date);

-- ============================================================
-- RUNNING ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS running_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 external_id text,
 source text DEFAULT 'manual' CHECK (source IN ('manual','strava','garmin')),
 title text,
 date date NOT NULL,
 distance_km numeric(6,3),
 duration_seconds integer,
 pace_sec_per_km integer,
 calories integer,
 heart_rate_avg integer,
 heart_rate_max integer,
 elevation_m integer,
 notes text,
 raw_data jsonb,
 created_at timestamptz DEFAULT now(),
 UNIQUE(user_id, source, external_id)
);

ALTER TABLE running_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own running activities" ON running_activities;
CREATE POLICY "Users manage own running activities" ON running_activities
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_running_user_id ON running_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_running_date ON running_activities(date);

-- ============================================================
-- TRAINING PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS training_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 name text NOT NULL,
 goal text,
 start_date date,
 end_date date,
 is_active boolean DEFAULT false,
 sessions jsonb DEFAULT '[]',
 created_at timestamptz DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own training plans" ON training_plans;
CREATE POLICY "Users manage own training plans" ON training_plans
 FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 name text NOT NULL,
 description text,
 prep_time integer,
 cook_time integer,
 servings integer DEFAULT 2,
 calories integer,
 image_url text,
 ingredients jsonb NOT NULL DEFAULT '[]',
 steps jsonb NOT NULL DEFAULT '[]',
 tags text[],
 is_favorite boolean DEFAULT false,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recipes" ON recipes;
CREATE POLICY "Users manage own recipes" ON recipes
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);

-- ============================================================
-- MEAL PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
 date date NOT NULL,
 meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
 servings integer DEFAULT 1,
 notes text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own meal plans" ON meal_plans;
CREATE POLICY "Users manage own meal plans" ON meal_plans
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);

-- ============================================================
-- SHOPPING LISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 name text NOT NULL,
 date date,
 status text DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
 total_estimated numeric(8,2),
 total_actual numeric(8,2),
 notes text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own shopping lists" ON shopping_lists;
CREATE POLICY "Users manage own shopping lists" ON shopping_lists
 FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SHOPPING ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 shopping_list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
 recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
 name text NOT NULL,
 quantity numeric(8,3),
 unit text,
 category text,
 price_estimated numeric(6,2),
 price_actual numeric(6,2),
 is_checked boolean DEFAULT false,
 barcode text,
 product_id text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own shopping items" ON shopping_items;
CREATE POLICY "Users manage own shopping items" ON shopping_items
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(shopping_list_id);

-- ============================================================
-- BUDGET CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 name text NOT NULL,
 type text NOT NULL CHECK (type IN ('income','expense')),
 color text,
 icon text,
 budget_monthly numeric(10,2),
 created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own budget categories" ON budget_categories;
CREATE POLICY "Users manage own budget categories" ON budget_categories
 FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 budget_category_id uuid REFERENCES budget_categories(id) ON DELETE SET NULL,
 project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
 shopping_list_id uuid REFERENCES shopping_lists(id) ON DELETE SET NULL,
 amount numeric(10,2) NOT NULL,
 type text NOT NULL CHECK (type IN ('income','expense')),
 description text,
 date date NOT NULL,
 is_recurring boolean DEFAULT false,
 recurrence_rule text,
 receipt_url text,
 created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
CREATE POLICY "Users manage own transactions" ON transactions
 FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- ============================================================
-- INTEGRATIONS (tokens OAuth)
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 provider text NOT NULL CHECK (provider IN ('strava','garmin','google_calendar')),
 access_token text,
 refresh_token text,
 expires_at timestamptz,
 scope text,
 metadata jsonb,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(),
 UNIQUE(user_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own integrations" ON integrations;
CREATE POLICY "Users manage own integrations" ON integrations
 FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_projects ON projects;
DROP TRIGGER IF EXISTS set_updated_at_tasks ON tasks;
DROP TRIGGER IF EXISTS set_updated_at_recipes ON recipes;
DROP TRIGGER IF EXISTS set_updated_at_integrations ON integrations;

CREATE TRIGGER set_updated_at_projects
 BEFORE UPDATE ON projects
 FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_tasks
 BEFORE UPDATE ON tasks
 FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_recipes
 BEFORE UPDATE ON recipes
 FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_integrations
 BEFORE UPDATE ON integrations
 FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS groupe TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_groupe ON projects(groupe);

---
---

#Limit providers and event sources

---

ALTER TABLE integrations
 DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE integrations
 ADD CONSTRAINT integrations_provider_check
 CHECK (provider IN ('strava','garmin','google_calendar','apple_calendar'));

ALTER TABLE events
 DROP CONSTRAINT IF EXISTS events_source_check;

ALTER TABLE events
 ADD CONSTRAINT events_source_check
 CHECK (source IN ('manual','strava','garmin','google','apple','synced'));

---
---

#Extend Budgets and Transactions Schema

---

-- colle le contenu de supabase/budget_extended.sql
ALTER TABLE budget_categories
 ADD COLUMN IF NOT EXISTS subtype text DEFAULT 'expense'
 CHECK (subtype IN ('income','expense','bill','savings','debt'));
UPDATE budget_categories SET subtype = 'income' WHERE type = 'income';
ALTER TABLE transactions
 ADD COLUMN IF NOT EXISTS account text;
ALTER TABLE transactions
 ADD COLUMN IF NOT EXISTS person text DEFAULT 'Nathan';