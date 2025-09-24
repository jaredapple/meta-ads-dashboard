const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('Running client accounts migration...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'src', 'database', 'migration-client-accounts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Replace placeholders with actual values from environment
    const processedSQL = migrationSQL
      .replace('PLACEHOLDER_ACCOUNT_ID', process.env.META_ACCOUNT_ID || '')
      .replace('PLACEHOLDER_TOKEN', process.env.META_ACCESS_TOKEN || '');
    
    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: processedSQL
    });

    if (error) {
      // If the RPC function doesn't exist, try direct execution
      console.log('Note: exec_sql RPC not found, migration needs to be run manually in Supabase dashboard');
      console.log('\nPlease run the following migration in your Supabase SQL editor:');
      console.log('File: src/database/migration-client-accounts.sql');
      console.log('\nMake sure to replace the placeholder values:');
      console.log('- PLACEHOLDER_ACCOUNT_ID with:', process.env.META_ACCOUNT_ID);
      console.log('- PLACEHOLDER_TOKEN with your Meta access token');
    } else {
      console.log('Migration completed successfully!');
    }
    
    // Try to verify the table was created
    const { data: testData, error: testError } = await supabase
      .from('client_accounts')
      .select('count')
      .limit(1);
    
    if (!testError) {
      console.log('✅ client_accounts table verified successfully');
    } else {
      console.log('⚠️  Could not verify client_accounts table. You may need to run the migration manually.');
    }
    
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();