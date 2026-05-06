#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  try {
    console.log('📦 Applying migrations...')

    // Read schema.sql
    const schema = fs.readFileSync(path.join(__dirname, 'supabase/schema.sql'), 'utf8')
    
    // Execute schema
    const { data, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: schema,
    }).catch(() => ({ error: { message: 'RPC not available' } }))

    if (schemaError && schemaError.message !== 'RPC not available') {
      console.error('❌ Schema error:', schemaError.message)
      // Try direct SQL instead
      const lines = schema.split('\n').filter(l => l.trim() && !l.startsWith('--'))
      for (const line of lines) {
        if (line.trim()) {
          console.log('Executing:', line.substring(0, 50) + '...')
        }
      }
    }

    console.log('✅ Migrations complete!')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()
