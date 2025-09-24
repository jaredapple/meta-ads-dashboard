#!/usr/bin/env node

require('dotenv').config();
const { StandardizedETLService } = require('./src/services/standardized-etl');

async function syncMissingDate() {
  console.log('🔄 Syncing missing date: 2025-09-16');
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
    
    console.log(`🏢 Account: ${account.client_name} (${account.meta_account_id})`);
    
    // Manually sync specific date
    const axios = require('axios');
    const targetDate = '2025-09-16';
    
    console.log(`📅 Syncing data for: ${targetDate}`);
    
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/act_${account.meta_account_id}/insights`,
      {
        params: {
          access_token: account.access_token,
          level: 'account',
          fields: 'impressions,clicks,spend,reach,frequency,actions,action_values,purchase_roas,ctr,cpc,cpm,inline_link_clicks,outbound_clicks',
          time_range: JSON.stringify({
            since: targetDate,
            until: targetDate
          }),
          time_increment: 1,
          limit: 10
        }
      }
    );
    
    const insights = response.data.data || [];
    console.log(`Found ${insights.length} records for ${targetDate}`);
    
    for (const insight of insights) {
      console.log(`Processing: $${insight.spend || 0} spend, ${insight.clicks || 0} clicks`);
      await etlService.processAccountInsightRecord(account, insight);
    }
    
    console.log(`✅ Sync completed for ${targetDate}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.response?.data?.error?.message || error.message);
  }
}

syncMissingDate().catch(console.error);