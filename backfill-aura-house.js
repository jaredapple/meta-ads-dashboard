#!/usr/bin/env node

require('dotenv').config();
const { StandardizedETLService } = require('./src/services/standardized-etl');

async function backfillAuraHouseOnly() {
  console.log('🔄 Backfilling Aura House Historical Data Only');
  console.log('=============================================\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get Aura House account
    const accounts = await etlService.getActiveAccounts();
    const account = accounts.find(acc => acc.client_name === 'Aura House');
    
    if (!account) {
      console.log('❌ Aura House account not found');
      return;
    }
    
    console.log(`🏢 Account: ${account.client_name} (${account.meta_account_id})`);
    console.log('🎯 Syncing ONLY Aura House to avoid permission errors\n');
    
    // Calculate date range for last 60 days
    const accountTimezone = 'America/New_York';
    const nowInAccountTZ = new Date().toLocaleString('en-US', {timeZone: accountTimezone});
    const today = new Date(nowInAccountTZ);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get last 60 days range (excluding today)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 59); // 60 days back from yesterday
    
    const dateStart = formatDate(startDate);
    const dateEnd = formatDate(endDate);
    
    console.log(`📅 Backfilling date range: ${dateStart} to ${dateEnd}`);
    console.log(`📊 This will provide complete data for:`);
    console.log(`   - Last 7 days: ✅ Complete`);
    console.log(`   - Last 14 days: ✅ Complete`);
    console.log(`   - Last 30 days: ✅ Complete`);
    console.log(`   - Last 60 days: ✅ Complete\n`);
    
    console.log('🚀 Starting historical data sync for Aura House only...');
    console.log('⚠️  This may take a few minutes for 60 days of data\n');
    
    // Sync just this account for 60 days
    await etlService.syncAccount(account, 60);
    
    console.log('\n✅ Aura House historical backfill completed!');
    console.log('📈 Your dashboard now supports proper historical analysis');
    
  } catch (error) {
    console.error('❌ Backfill failed:', error.response?.data?.error?.message || error.message);
    console.error('Full error:', error);
  }
}

backfillAuraHouseOnly().catch(console.error);