#!/usr/bin/env node

/**
 * Create project tables in Supabase
 * Run: SUPABASE_URL=... SUPABASE_KEY=... node scripts/create-tables.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTables() {
  console.log('🚀 Creating project tables...\n')

  const queries = [
    {
      name: 'project_notes',
      sql: `
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
      `
    },
    {
      name: 'project_files',
      sql: `
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
      `
    },
    {
      name: 'project_settings',
      sql: `
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
      `
    }
  ]

  for (const query of queries) {
    try {
      console.log(`📝 Creating ${query.name}...`)
      // Note: This approach won't work without custom RPC
      // We'll need to manually run SQL via dashboard
      console.log(`   ⚠️  Please run this SQL manually in Supabase SQL editor:`)
      console.log(`   ${query.sql.replace(/\n/g, ' ')}`)
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`)
    }
  }

  console.log('\n📖 To create tables manually:')
  console.log('1. Go to: https://app.supabase.com/project/teqsxzfslpxejncrkudz/sql')
  console.log('2. Click "New Query"')
  console.log('3. Copy & paste SQL from supabase/schema.sql (lines for project_notes, project_files, project_settings)')
  console.log('4. Click "Run"')
}

createTables()
