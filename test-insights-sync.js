#!/usr/bin/env node

const { StandardizedETLService } = require('./src/services/standardized-etl');

async function testInsightsSync() {
  console.log('🔬 Testing Insights Sync Only');
  console.log('==============================\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get Aura House account
    const accounts = await etlService.getActiveAccounts();
    const account = accounts.find(acc => acc.client_name === 'Aura House');
    
    if (!account) {
      console.log('❌ Aura House account not found');
      return;
    }
    
    console.log(`🏢 Testing account: ${account.client_name} (${account.meta_account_id})`);
    
    // Update sync status
    await etlService.updateSyncStatus(account.id, 'syncing');
    
    // Test just the insights sync
    console.log('📊 Running insights sync...');
    try {
      await etlService.syncInsightsData(account, 7);  // 7 days
      console.log('✅ Insights sync completed');
    } catch (error) {
      console.error('❌ Insights sync failed:', error.message);
      console.error('Full error:', error);
    }
    
    // Update computed metrics
    console.log('🧮 Updating computed metrics...');
    try {
      await etlService.updateComputedMetrics(account);
      console.log('✅ Computed metrics updated');
    } catch (error) {
      console.error('❌ Computed metrics failed:', error.message);
    }
    
    // Mark as complete
    await etlService.updateSyncStatus(account.id, 'completed');
    
    console.log('\n🔍 Checking results...');
    
    // Check what we got
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    const { data: dbInsights, error } = await etlService.supabase
      .from('daily_ad_insights')
      .select('date_start, spend, impressions, clicks, link_clicks')
      .eq('account_id', account.meta_account_id)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)
      .order('date_start', { ascending: true });
    
    if (error) {
      console.error('Database error:', error);
    } else {
      console.log(`\n📊 Records in database: ${dbInsights.length}`);
      
      if (dbInsights.length > 0) {
        let totalSpend = 0;
        dbInsights.forEach(row => {
          console.log(`  ${row.date_start}: $${parseFloat(row.spend || 0).toFixed(2)} spend`);
          totalSpend += parseFloat(row.spend || 0);
        });
        console.log(`\n💰 Total Spend: $${totalSpend.toFixed(2)}`);
        console.log(`🎯 Target: $28,293.47 (from Meta API)`);
        console.log(`📈 Status: ${totalSpend > 25000 ? '✅ SUCCESS!' : totalSpend > 0 ? '🔶 Partial data' : '❌ No data'}`);
      } else {
        console.log('❌ No data found in database');
      }
    }
    
  } catch (error) {
    console.error('❌ Test insights sync failed:', error.message);
    console.error(error.stack);
  }
}

testInsightsSync().catch(console.error);