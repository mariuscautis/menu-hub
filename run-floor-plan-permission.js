const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://rfquwezkkdyvjftveilf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcXV3ZXpra2R5dmpmdHZlaWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MDEzMSwiZXhwIjoyMDc5ODI2MTMxfQ.aNJr9sOgAHCLGCPvKUHrxunL1wQor8S0CHrvqJhDCGI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    const sql = fs.readFileSync('./ADD_FLOOR_PLAN_PERMISSION.sql', 'utf8')

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('Error executing SQL:', error)
      process.exit(1)
    }

    console.log('✅ Floor plan permission added successfully!')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

runMigration()
