#!/usr/bin/env node

require('dotenv').config();
const { StandardizedETLService } = require('./src/services/standardized-etl');

async function syncIndividualAccount(accountName, days = 60) {
  console.log(`🔄 Syncing Individual Account: ${accountName}`);
  console.log('='.repeat(50) + '\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get the specific account
    const accounts = await etlService.getActiveAccounts();
    const account = accounts.find(acc => acc.client_name === accountName);
    
    if (!account) {
      console.log(`❌ Account "${accountName}" not found`);
      console.log('Available accounts:');
      accounts.forEach(acc => console.log(`  - ${acc.client_name}`));
      return;
    }
    
    console.log(`🏢 Account: ${account.client_name} (${account.meta_account_id})`);
    console.log(`📅 Syncing last ${days} days of data\n`);
    
    // Test account access first
    console.log('🔍 Testing account access...');
    const axios = require('axios');
    
    try {
      const testResponse = await axios.get(
        `https://graph.facebook.com/v21.0/act_${account.meta_account_id}`,
        {
          params: {
            access_token: account.access_token,
            fields: 'id,name,currency,timezone_name'
          }
        }
      );
      
      console.log(`✅ Account access confirmed: ${testResponse.data.name}`);
      console.log(`   Currency: ${testResponse.data.currency}`);
      console.log(`   Timezone: ${testResponse.data.timezone_name}\n`);
      
    } catch (accessError) {
      console.log('❌ Account access failed:', accessError.response?.data?.error?.message || accessError.message);
      console.log('💡 This could be due to:');
      console.log('   - Expired access token');
      console.log('   - Insufficient permissions');
      console.log('   - Account restrictions\n');
      return;
    }
    
    // Sync the account
    console.log('🚀 Starting data sync...');
    await etlService.syncAccount(account, days);
    
    console.log(`\n✅ ${accountName} sync completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Sync failed for ${accountName}:`, error.response?.data?.error?.message || error.message);
    if (error.response?.status === 403) {
      console.log('💡 This is likely a permissions issue with the access token');
    }
  }
}

// Get account name from command line argument
const accountName = process.argv[2];
const days = process.argv[3] ? parseInt(process.argv[3]) : 60;

if (!accountName) {
  console.log('Usage: node sync-individual-account.js "Account Name" [days]');
  console.log('Example: node sync-individual-account.js "Pair of Thieves" 60');
  process.exit(1);
}

syncIndividualAccount(accountName, days).catch(console.error);