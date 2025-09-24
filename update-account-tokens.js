#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function updateAccountToken(accountName, accessToken) {
  console.log(`🔑 Updating Access Token for: ${accountName}`);
  console.log('='.repeat(50) + '\n');

  try {
    // First, get the account info
    const { data: accounts, error: fetchError } = await supabase
      .from('client_accounts')
      .select('client_name, meta_account_id')
      .eq('client_name', accountName);

    if (fetchError || !accounts.length) {
      console.log(`❌ Account "${accountName}" not found in database`);
      return;
    }

    const account = accounts[0];
    console.log(`🏢 Found account: ${account.client_name} (${account.meta_account_id})`);

    // Test the token by trying to fetch account info
    console.log('🔍 Testing access token...');
    
    try {
      const testResponse = await axios.get(
        `https://graph.facebook.com/v21.0/act_${account.meta_account_id}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,currency,timezone_name,account_status'
          }
        }
      );

      console.log('✅ Token test successful!');
      console.log(`   Account Name: ${testResponse.data.name}`);
      console.log(`   Currency: ${testResponse.data.currency}`);
      console.log(`   Timezone: ${testResponse.data.timezone_name}`);
      console.log(`   Status: ${testResponse.data.account_status}\n`);

    } catch (testError) {
      console.log('❌ Token test failed:', testError.response?.data?.error?.message || testError.message);
      console.log('💡 Please check:');
      console.log('   - Token is valid and not expired');
      console.log('   - Token has ads_read permission'); 
      console.log('   - Account ID is correct');
      return;
    }

    // Update the token in database
    console.log('💾 Updating token in database...');
    
    const { error: updateError } = await supabase
      .from('client_accounts')
      .update({ 
        access_token: accessToken,
        last_sync_at: new Date().toISOString()
      })
      .eq('client_name', accountName);

    if (updateError) {
      console.log('❌ Database update failed:', updateError.message);
      return;
    }

    console.log('✅ Token updated successfully!');
    console.log(`🚀 You can now sync ${accountName} data with:`);
    console.log(`   node sync-individual-account.js "${accountName}" 60\n`);

  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
}

// Usage
const accountName = process.argv[2];
const accessToken = process.argv[3];

if (!accountName || !accessToken) {
  console.log('Usage: node update-account-tokens.js "Account Name" "ACCESS_TOKEN"');
  console.log('');
  console.log('Examples:');
  console.log('  node update-account-tokens.js "Pair of Thieves" "EAAxxxxxx..."');
  console.log('  node update-account-tokens.js "Zenagen" "EAAxxxxxx..."');
  console.log('');
  console.log('Available accounts:');
  
  supabase
    .from('client_accounts')
    .select('client_name, meta_account_id')
    .then(({ data }) => {
      data?.forEach(acc => console.log(`  - "${acc.client_name}" (${acc.meta_account_id})`));
    });
  
  process.exit(1);
}

updateAccountToken(accountName, accessToken).catch(console.error);