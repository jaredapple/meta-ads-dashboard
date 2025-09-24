#!/usr/bin/env node

const { StandardizedETLService } = require('./src/services/standardized-etl');

async function syncTodayYesterday() {
  console.log('🔄 Syncing Today and Yesterday Data');
  console.log('====================================\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get Aura House account
    const accounts = await etlService.getActiveAccounts();
    const account = accounts.find(acc => acc.client_name === 'Aura House');
    
    if (!account) {
      console.log('❌ Aura House account not found');
      return;
    }
    
    console.log(`🏢 Syncing account: ${account.client_name} (${account.meta_account_id})`);
    
    // Sync yesterday (1 day back)
    console.log('📅 Syncing yesterday\'s data...');
    await etlService.syncInsightsData(account, 1);
    
    // Also try today (though there may be no data yet)
    console.log('📅 Syncing today\'s data...');
    
    // Manually sync today's data
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`Fetching today's data (${todayStr})...`);
    
    try {
      const axios = require('axios');
      
      // Get today's insights
      const todayResponse = await axios.get(
        `https://graph.facebook.com/v21.0/act_${account.meta_account_id}/insights`,
        {
          params: {
            access_token: account.access_token,
            level: 'account',
            fields: 'impressions,clicks,spend,reach,frequency,actions,action_values,purchase_roas,ctr,cpc,cpm,inline_link_clicks,outbound_clicks',
            time_range: JSON.stringify({
              since: todayStr,
              until: todayStr
            }),
            time_increment: 1,
            limit: 10
          }
        }
      );
      
      const todayInsights = todayResponse.data.data || [];
      console.log(`Found ${todayInsights.length} records for today`);
      
      for (const insight of todayInsights) {
        console.log(`Processing today's data: $${insight.spend || 0} spend, ${insight.clicks || 0} clicks`);
        await etlService.processAccountInsightRecord(account, insight);
      }
      
      if (todayInsights.length === 0) {
        console.log('ℹ️  No data available for today yet (normal if early in the day)');
      }
      
    } catch (error) {
      console.log('⚠️  Could not sync today\'s data:', error.response?.data?.error?.message || error.message);
    }
    
    console.log('✅ Sync completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

syncTodayYesterday().catch(console.error);