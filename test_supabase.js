import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://teqsxzfslpxejncrkudz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcXN4emZzbHB4ZWpuY3JrdWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTgxNjUsImV4cCI6MjA5Mjg3NDE2NX0._BHPVzZLxgdJh4oJflx_T9ZkXK6olmC5Y3fNF_Cbo7A'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1)
    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('✅ Supabase Connected!')
      console.log('Sample data:', data?.length ? 'Tables exist' : 'Empty')
    }
  } catch (e) {
    console.log('❌ Connection failed:', e.message)
  }
}

test()
