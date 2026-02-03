/**
 * Database Migration: Add is_hub column to staff table
 *
 * Run this script once to add the hub user functionality.
 * Usage: node add-hub-user-column.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addHubColumn() {
  console.log('🔄 Adding is_hub column to staff table...')

  try {
    // Run SQL to add column and constraint
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add is_hub column if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'staff' AND column_name = 'is_hub'
          ) THEN
            ALTER TABLE staff ADD COLUMN is_hub BOOLEAN DEFAULT FALSE;
            COMMENT ON COLUMN staff.is_hub IS 'Designates this staff member as the local hub coordinator';
          END IF;
        END $$;

        -- Create unique constraint: only one hub per restaurant
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'one_hub_per_restaurant'
          ) THEN
            CREATE UNIQUE INDEX one_hub_per_restaurant
            ON staff (restaurant_id)
            WHERE is_hub = true;
          END IF;
        END $$;
      `
    })

    if (error) {
      // If exec_sql RPC doesn't exist, try direct SQL (requires service role key)
      console.log('⚠️  RPC method failed, trying direct SQL...')

      // Check if column exists
      const { data: columnCheck } = await supabase
        .from('staff')
        .select('is_hub')
        .limit(1)

      if (columnCheck) {
        console.log('✅ Column already exists!')
        return true
      }

      throw new Error('Could not add column. Please run SQL manually in Supabase dashboard.')
    }

    console.log('✅ Successfully added is_hub column!')
    console.log('✅ Added unique constraint: one hub per restaurant')
    return true

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.log('\n📋 Manual SQL (run in Supabase SQL Editor):')
    console.log(`
-- Add is_hub column
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_hub BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN staff.is_hub IS 'Designates this staff member as the local hub coordinator';

-- Create unique constraint: only one hub per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS one_hub_per_restaurant
ON staff (restaurant_id)
WHERE is_hub = true;
    `)
    return false
  }
}

async function testMigration() {
  console.log('\n🧪 Testing migration...')

  try {
    // Try to query the new column
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, is_hub')
      .limit(1)

    if (error) throw error

    console.log('✅ Migration successful! Column is queryable.')
    return true
  } catch (err) {
    console.error('❌ Test failed:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Hub User Migration\n')

  const success = await addHubColumn()

  if (success) {
    await testMigration()
    console.log('\n✅ Migration complete! You can now designate hub users.')
  } else {
    console.log('\n❌ Migration failed. Please run the SQL manually.')
    process.exit(1)
  }
}

main()
