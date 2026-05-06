#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const setupSQL = `
-- Project Notes
CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  color text DEFAULT '#F2F2F0'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON public.project_notes USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_user_id ON public.project_notes USING btree (user_id);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own project notes" ON public.project_notes;
CREATE POLICY "Users manage own project notes" ON public.project_notes
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- Project Files
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON public.project_files USING btree (user_id);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own project files" ON public.project_files;
CREATE POLICY "Users manage own project files" ON public.project_files
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- Project Settings
CREATE TABLE IF NOT EXISTS public.project_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (project_id, key),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON public.project_settings USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_settings_user_id ON public.project_settings USING btree (user_id);

ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own project settings" ON public.project_settings;
CREATE POLICY "Users manage own project settings" ON public.project_settings
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;
`

async function setup() {
  console.log('🚀 Setting up Supabase tables...\n')
  
  try {
    // Try to execute SQL via admin API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: setupSQL })
    })

    if (!response.ok) {
      const error = await response.json()
      console.log('ℹ️  RPC method not available - instructions to set up manually:')
      console.log('\n1. Go to Supabase Dashboard: https://app.supabase.com')
      console.log('2. Select your project')
      console.log('3. Go to SQL Editor')
      console.log('4. Click "New Query"')
      console.log('5. Paste the SQL from supabase/schema.sql')
      console.log('6. Click "Run"\n')
      return
    }

    console.log('✅ Tables created successfully!')
    console.log('📊 Tables: project_notes, project_files, project_settings')
  } catch (err) {
    console.error('Error:', err.message)
    console.log('\nPlease manually create tables via Supabase SQL Editor')
  }
}

setup()
