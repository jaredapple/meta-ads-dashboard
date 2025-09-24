const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = 'EAAOHRZBAgxEsBPOT90SjZCaEhbRQZACGrH1AZB5rgvZA1Al6v1NhmUSKBzKi1I5UlfYuQiVCbF8OrGNqitv3eIAK5Gn8LmlpPWR7ZAAXuwbn53fNSFA4vE6A1EcqokQ2XB2ng2zNDSNGUhM1UOgQS558JsENye42O7xFp8jwOBjpca7YrXgWv3ZCQhj9HyFUjZCCAHF1yhE7MIYcn9ZAe7ditc9RyQZCpIZBDqqXITbLPx6rQZDZD';

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  { id: '19684614', name: 'Pair of Thieves' },
  { id: '773006558299181', name: 'Zenagen' }
];

async function syncAccount(accountId, accountName) {
  console.log(`\n=== Syncing ${accountName} (${accountId}) ===`);
  
  try {
    // 1. First, get account info and create/update account record
    console.log('1. Fetching account info...');
    const accountResponse = await axios.get(`https://graph.facebook.com/v21.0/act_${accountId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,currency,timezone_name'
      }
    });
    
    const accountData = accountResponse.data;
    console.log('Account info:', accountData);
    
    // Upsert account
    const { error: accountError } = await supabase
      .from('accounts')
      .upsert({
        id: accountId,
        name: accountData.name,
        currency: accountData.currency || 'USD',
        timezone: accountData.timezone_name || 'America/New_York'
      });
    
    if (accountError) {
      console.error('Error upserting account:', accountError);
      return;
    }
    
    // 2. Get campaigns
    console.log('2. Fetching campaigns...');
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v21.0/act_${accountId}/campaigns`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
        limit: 100
      }
    });
    
    const campaigns = campaignsResponse.data.data || [];
    console.log(`Found ${campaigns.length} campaigns`);
    
    for (const campaign of campaigns) {
      // Upsert campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .upsert({
          id: campaign.id,
          account_id: accountId,
          name: campaign.name,
          objective: campaign.objective || 'OUTCOME_TRAFFIC',
          status: campaign.status || 'PAUSED',
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          start_time: campaign.start_time || null,
          stop_time: campaign.stop_time || null,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time
        });
      
      if (campaignError) {
        console.error('Error upserting campaign:', campaignError);
        continue;
      }
    }
    
    // 3. Get insights for the account (last 7 days)
    console.log('3. Fetching insights...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`Date range: ${dateStart} to ${dateEnd}`);
    
    const insightsResponse = await axios.get(`https://graph.facebook.com/v21.0/act_${accountId}/insights`, {
      params: {
        access_token: accessToken,
        level: 'ad',
        fields: 'impressions,clicks,spend,reach,frequency,conversions,conversion_values',
        time_range: JSON.stringify({
          since: dateStart,
          until: dateEnd
        }),
        time_increment: 1,
        limit: 1000
      }
    });
    
    const insights = insightsResponse.data.data || [];
    console.log(`Found ${insights.length} insight records`);
    
    // Insert insights (simplified version)
    for (const insight of insights) {
      const { error: insightError } = await supabase
        .from('daily_ad_insights')
        .upsert({
          date_start: insight.date_start,
          account_id: accountId,
          campaign_id: insight.campaign_id,
          ad_set_id: insight.adset_id,
          ad_id: insight.ad_id,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          reach: parseInt(insight.reach || '0'),
          frequency: parseFloat(insight.frequency || '0'),
          conversions: parseFloat(insight.conversions?.[0]?.value || '0'),
          conversion_values: parseFloat(insight.conversion_values?.[0]?.value || '0'),
          link_clicks: 0, // Not available in insights API
          video_views: 0,
          video_p25_watched_actions: 0,
          video_p50_watched_actions: 0,
          video_p75_watched_actions: 0,
          video_p100_watched_actions: 0
        }, {
          onConflict: 'ad_id,date_start'
        });
      
      if (insightError) {
        console.error('Error upserting insight:', insightError);
      }
    }
    
    console.log(`✅ Successfully synced ${accountName}`);
    
  } catch (error) {
    console.error(`❌ Error syncing ${accountName}:`, error.response?.data || error.message);
  }
}

async function syncAllAccounts() {
  console.log('Starting account sync...');
  
  for (const account of accounts) {
    await syncAccount(account.id, account.name);
    
    // Wait a bit between accounts to avoid rate limits
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 All accounts synced!');
}

syncAllAccounts().catch(console.error);