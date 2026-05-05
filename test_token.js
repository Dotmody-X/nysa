import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://teqsxzfslpxejncrkudz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  try {
    // Test: Récupère le nombre de projets
    const { data, error, count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: false })
    
    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('✅ Supabase Connected!')
      console.log(`📊 Projects count: ${count}`)
      console.log(`✅ Tables are working!`)
    }
  } catch (e) {
    console.log('❌ Connection failed:', e.message)
  }
  process.exit(0)
}

test()
