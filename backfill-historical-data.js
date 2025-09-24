#!/usr/bin/env node

require('dotenv').config();
const { StandardizedETLService } = require('./src/services/standardized-etl');

async function backfillHistoricalData() {
  console.log('🔄 Backfilling Historical Data for Analytics');
  console.log('==========================================\n');

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
    
    // Calculate date range for last 90 days
    const accountTimezone = 'America/New_York';
    const nowInAccountTZ = new Date().toLocaleString('en-US', {timeZone: accountTimezone});
    const today = new Date(nowInAccountTZ);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get last 90 days range (excluding today)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 89); // 90 days back from yesterday
    
    const dateStart = formatDate(startDate);
    const dateEnd = formatDate(endDate);
    
    console.log(`📅 Backfilling date range: ${dateStart} to ${dateEnd}`);
    console.log(`📊 This will provide data for:`);
    console.log(`   - Last 7 days: ✅ Complete`);
    console.log(`   - Last 14 days: ✅ Complete`);
    console.log(`   - Last 30 days: ✅ Complete`);
    console.log(`   - Last 60 days: ✅ Complete`);
    console.log(`   - Last 90 days: ✅ Complete\n`);
    
    // Use the standardized ETL service to sync the historical data
    console.log('🚀 Starting historical data sync...');
    console.log('⚠️  This may take several minutes for 90 days of data\n');
    
    // Sync 90 days of data
    await etlService.syncInsightsData(account, 90);
    
    console.log('\n✅ Historical backfill completed!');
    console.log('📈 Your dashboard now supports proper historical analysis for:');
    console.log('   - Last 7 days');
    console.log('   - Last 14 days');  
    console.log('   - Last 30 days');
    console.log('   - Last 60 days');
    console.log('   - Last 90 days');
    
  } catch (error) {
    console.error('❌ Backfill failed:', error.response?.data?.error?.message || error.message);
    console.error('Stack trace:', error.stack);
  }
}

backfillHistoricalData().catch(console.error);