-- Create setup function that creates missing tables
CREATE OR REPLACE FUNCTION public.setup_project_tables()
RETURNS json AS $$
DECLARE
  result json := '{"status": "ok", "tables": []}';
BEGIN
  -- Create project_notes if not exists
  CREATE TABLE IF NOT EXISTS public.project_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    color text DEFAULT '#F2F2F0',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON public.project_notes(project_id);
  ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users manage own project notes" ON public.project_notes;
  CREATE POLICY "Users manage own project notes" ON public.project_notes
    FOR ALL USING (auth.uid() = user_id);

  -- Create project_files if not exists
  CREATE TABLE IF NOT EXISTS public.project_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    filename text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    file_type text NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
  ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users manage own project files" ON public.project_files;
  CREATE POLICY "Users manage own project files" ON public.project_files
    FOR ALL USING (auth.uid() = user_id);

  -- Create project_settings if not exists
  CREATE TABLE IF NOT EXISTS public.project_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    key text NOT NULL,
    value jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(project_id, key)
  );
  CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON public.project_settings(project_id);
  ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users manage own project settings" ON public.project_settings;
  CREATE POLICY "Users manage own project settings" ON public.project_settings
    FOR ALL USING (auth.uid() = user_id);

  RETURN json_build_object('status', 'ok', 'tables', ARRAY['project_notes', 'project_files', 'project_settings']);
END;
$$ LANGUAGE plpgsql;
