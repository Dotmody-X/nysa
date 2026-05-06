import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin
    if (user.email !== 'nathan@example.com') { // Change to actual admin email
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Apply migrations
    const migrations = [
      {
        name: 'project_notes',
        sql: `
          CREATE TABLE IF NOT EXISTS project_notes (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
            title text NOT NULL,
            content text NOT NULL,
            color text DEFAULT '#F2F2F0',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          );
          
          ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users manage own project notes" ON project_notes;
          CREATE POLICY "Users manage own project notes" ON project_notes
            FOR ALL USING (auth.uid() = user_id);
          CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);
        `
      },
      {
        name: 'project_files',
        sql: `
          CREATE TABLE IF NOT EXISTS project_files (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
            filename text NOT NULL,
            file_path text NOT NULL,
            file_size integer NOT NULL,
            file_type text NOT NULL,
            created_at timestamptz DEFAULT now()
          );
          
          ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users manage own project files" ON project_files;
          CREATE POLICY "Users manage own project files" ON project_files
            FOR ALL USING (auth.uid() = user_id);
          CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
        `
      },
      {
        name: 'project_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS project_settings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
            key text NOT NULL,
            value jsonb,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE(project_id, key)
          );
          
          ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users manage own project settings" ON project_settings;
          CREATE POLICY "Users manage own project settings" ON project_settings
            FOR ALL USING (auth.uid() = user_id);
          CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);
        `
      }
    ]

    const results = []
    for (const migration of migrations) {
      try {
        const { error } = await supabase.rpc('exec', { p_query: migration.sql }).catch(() => ({
          error: { message: 'RPC not available - using fallback' }
        }))

        if (error?.message?.includes('not available')) {
          results.push({ name: migration.name, status: 'skipped', reason: 'RPC not available' })
        } else {
          results.push({ name: migration.name, status: error ? 'error' : 'success', error: error?.message })
        }
      } catch (err: any) {
        results.push({ name: migration.name, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ status: 'complete', migrations: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
