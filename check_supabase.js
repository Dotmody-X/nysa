#!/usr/bin/env node
/**
 * Quick debug script to check Supabase time_entries data
 */
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://teqsxzfslpxejncrkudz.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcXN4emZzbHB4ZWpuY3JrdWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTgxNjUsImV4cCI6MjA5Mjg3NDE2NX0._BHPVzZLxgdJh4oJflx_T9ZkXK6olmC5Y3fNF_Cbo7A'

const supabase = createClient(url, anonKey)

async function main() {
  console.log('\n📊 Checking Supabase time_entries table...\n')

  try {
    // Test 1: Check connection
    console.log('1️⃣  Testing connection...')
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) {
      console.log('   ⚠️  Not authenticated (expected for anon key)')
    } else {
      console.log('   ✅ User:', auth?.user?.id)
    }

    // Test 2: Count entries
    console.log('\n2️⃣  Counting entries...')
    const { data: countData, error: countErr, count } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
    
    if (countErr) {
      console.log('   ❌ Error:', countErr)
    } else {
      console.log(`   ✅ Total entries: ${count}`)
    }

    // Test 3: Fetch latest 5 entries
    console.log('\n3️⃣  Fetching latest 5 entries...')
    const { data: entries, error: entriesErr } = await supabase
      .from('time_entries')
      .select('*, projects(name, color)')
      .order('started_at', { ascending: false })
      .limit(5)

    if (entriesErr) {
      console.log('   ❌ Error:', entriesErr)
    } else if (!entries || entries.length === 0) {
      console.log('   ⚠️  No entries found')
    } else {
      console.log(`   ✅ Found ${entries.length} entries:`)
      entries.forEach((e, i) => {
        console.log(`\n   [${i+1}]`)
        console.log(`       ID: ${e.id}`)
        console.log(`       Description: ${e.description || '(none)'}`)
        console.log(`       Project: ${e.projects?.name || 'None'}`)
        console.log(`       Started: ${e.started_at}`)
        console.log(`       Duration: ${e.duration_seconds ?? '(ongoing)'} seconds`)
      })
    }

    // Test 4: Check table structure
    console.log('\n4️⃣  Checking table structure...')
    const { data: tableInfo, error: tableErr } = await supabase
      .from('time_entries')
      .select('id')
      .limit(1)

    if (tableErr) {
      console.log('   ❌ Table error:', tableErr.message)
      if (tableErr.message.includes('does not exist')) {
        console.log('\n   💥 Table "time_entries" does not exist!')
        console.log('   Run setup-tables.mjs to initialize the database.')
      }
    } else {
      console.log('   ✅ Table exists and is accessible')
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message)
  }

  console.log('\n')
}

main()
