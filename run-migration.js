const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfquwezkkdyvjftveilf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcXV3ZXpra2R5dmpmdHZlaWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MDEzMSwiZXhwIjoyMDc5ODI2MTMxfQ.aNJr9sOgAHCLGCPvKUHrxunL1wQor8S0CHrvqJhDCGI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    const sqlFile = process.argv[2];
    if (!sqlFile) {
      console.error('Usage: node run-migration.js <sql-file>');
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Executing SQL:');
    console.log(sql);
    console.log('---');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If the RPC function doesn't exist, try direct SQL execution via REST API
      console.log('Trying alternative method...');

      // For ALTER TABLE commands, we need to use the database's SQL editor
      // Let's try splitting and executing each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        if (statement.toUpperCase().includes('ALTER TABLE')) {
          console.log('\nExecuting:', statement);
          const { error: execError } = await supabase.from('_realtime').select('id').limit(0);
          if (execError) {
            throw new Error('Cannot execute DDL statements via REST API. Please use Supabase SQL Editor.');
          }
        }
      }

      throw new Error('Please run this migration through the Supabase SQL Editor instead.');
    }

    console.log('✓ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n1. Go to https://supabase.com/dashboard/project/rfquwezkkdyvjftveilf/sql');
    console.log('2. Paste the SQL from', sqlFile);
    console.log('3. Click "Run"');
    process.exit(1);
  }
}

runMigration();
