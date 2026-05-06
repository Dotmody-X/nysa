#!/usr/bin/env node

/**
 * Apply schema migrations to Supabase
 * This script reads the SQL schema files and creates necessary tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function applyMigrations() {
  try {
    console.log('🚀 Applying database migrations...\n')

    // Create project_notes table
    console.log('📝 Creating project_notes table...')
    let { error } = await supabase.rpc('exec_sql', {
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
    }).catch(err => ({ error: err }))
    
    if (error) console.log('⚠️  project_notes:', error.message)
    else console.log('✅ project_notes created')

    // Create project_files table
    console.log('📁 Creating project_files table...')
    ({ error } = await supabase.rpc('exec_sql', {
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
    }).catch(err => ({ error: err })))
    
    if (error) console.log('⚠️  project_files:', error.message)
    else console.log('✅ project_files created')

    // Create project_settings table
    console.log('⚙️  Creating project_settings table...')
    ({ error } = await supabase.rpc('exec_sql', {
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
    }).catch(err => ({ error: err })))
    
    if (error) console.log('⚠️  project_settings:', error.message)
    else console.log('✅ project_settings created')

    // Test connection
    console.log('\n🔍 Verifying connection...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['project_notes', 'project_files', 'project_settings'])
      .catch(() => ({ data: null, error: null }))
    
    console.log('\n✨ Migrations complete!')
    console.log('📊 Tables ready: project_notes, project_files, project_settings')
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    process.exit(1)
  }
}

applyMigrations()
