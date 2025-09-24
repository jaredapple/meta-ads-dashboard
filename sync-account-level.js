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

async function syncAccountLevelData(accountId, accountName) {
  console.log(`\n=== Syncing ${accountName} (Account Level) ===`);
  
  try {
    // Get account-level insights for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`Date range: ${dateStart} to ${dateEnd}`);
    
    // Get account-level insights (aggregated)
    const insightsResponse = await axios.get(`https://graph.facebook.com/v21.0/act_${accountId}/insights`, {
      params: {
        access_token: accessToken,
        level: 'account',  // Account level instead of ad level
        fields: 'impressions,clicks,spend,reach,frequency,conversions,conversion_values,ctr,cpc,cpm',
        time_range: JSON.stringify({
          since: dateStart,
          until: dateEnd
        }),
        time_increment: 1,  // Daily breakdown
        limit: 100
      }
    });
    
    const insights = insightsResponse.data.data || [];
    console.log(`Found ${insights.length} daily account-level insights`);
    
    if (insights.length === 0) {
      console.log('⚠️  No insights data available for this account');
      return;
    }
    
    // Create fake ad structure for database compatibility
    // We'll use account ID as campaign, ad set, and ad ID
    const fakeAdId = `account_${accountId}`;
    const fakeCampaignId = `campaign_${accountId}`;
    const fakeAdSetId = `adset_${accountId}`;
    
    // First, create fake campaign
    await supabase
      .from('campaigns')
      .upsert({
        id: fakeCampaignId,
        account_id: accountId,
        name: `${accountName} - Aggregated Data`,
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });
    
    // Create fake ad set
    await supabase
      .from('ad_sets')
      .upsert({
        id: fakeAdSetId,
        campaign_id: fakeCampaignId,
        account_id: accountId,
        name: `${accountName} - Aggregated AdSet`,
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });
    
    // Create fake ad
    await supabase
      .from('ads')
      .upsert({
        id: fakeAdId,
        ad_set_id: fakeAdSetId,
        campaign_id: fakeCampaignId,
        account_id: accountId,
        name: `${accountName} - Aggregated Ad`,
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });
    
    console.log('Created fake campaign/adset/ad structure');
    
    // Insert account-level insights
    for (const insight of insights) {
      const insightData = {
        date_start: insight.date_start,
        account_id: accountId,
        campaign_id: fakeCampaignId,
        ad_set_id: fakeAdSetId,
        ad_id: fakeAdId,
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: parseFloat(insight.spend || '0'),
        reach: parseInt(insight.reach || '0'),
        frequency: parseFloat(insight.frequency || '0'),
        conversions: parseFloat(insight.conversions?.[0]?.value || '0'),
        conversion_values: parseFloat(insight.conversion_values?.[0]?.value || '0'),
        link_clicks: parseInt(insight.clicks || '0'), // Use clicks as link_clicks approximation
        video_views: 0,
        video_p25_watched_actions: 0,
        video_p50_watched_actions: 0,
        video_p75_watched_actions: 0,
        video_p100_watched_actions: 0
      };
      
      const { error: insightError } = await supabase
        .from('daily_ad_insights')
        .upsert(insightData, {
          onConflict: 'ad_id,date_start'
        });
      
      if (insightError) {
        console.error('Error upserting insight:', insightError);
      } else {
        console.log(`✓ Synced ${insight.date_start}: $${insight.spend}, ${insight.impressions} impressions`);
      }
    }
    
    console.log(`✅ Successfully synced ${accountName} with ${insights.length} days of data`);
    
  } catch (error) {
    console.error(`❌ Error syncing ${accountName}:`, error.response?.data || error.message);
  }
}

async function syncAllAccountsLevel() {
  console.log('Starting account-level sync...');
  
  for (const account of accounts) {
    await syncAccountLevelData(account.id, account.name);
    
    // Wait between accounts
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Account-level sync complete!');
}

syncAllAccountsLevel().catch(console.error);