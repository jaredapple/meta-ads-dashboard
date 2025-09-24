#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Meta API credentials
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ACCOUNT_ID;

console.log('🚀 Testing Supabase Connection and Data Loading...\n');

async function testSupabaseConnection() {
  try {
    // Test 1: Database connection
    console.log('📡 Testing Supabase connection...');
    const { data, error } = await supabase
      .from('accounts')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('✅ Supabase connection successful');

    // Test 2: Load account data
    console.log('\n🏢 Loading account data...');
    const accountResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,account_status,currency,timezone_name,business_name'
      }
    });

    const accountData = {
      id: ACCOUNT_ID.replace('act_', ''),
      name: accountResponse.data.name,
      currency: accountResponse.data.currency,
      timezone: accountResponse.data.timezone_name,
      business_id: accountResponse.data.business?.id || null
    };

    const { error: accountError } = await supabase
      .from('accounts')
      .upsert(accountData);

    if (accountError) throw accountError;
    console.log(`✅ Account "${accountData.name}" loaded successfully`);

    // Test 3: Load campaigns
    console.log('\n📊 Loading campaigns...');
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/campaigns`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,status,objective,created_time,updated_time,daily_budget,lifetime_budget,start_time,stop_time',
        limit: 25
      }
    });

    const campaigns = campaignsResponse.data.data.map(campaign => ({
      id: campaign.id,
      account_id: ACCOUNT_ID.replace('act_', ''),
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status.toUpperCase(),
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
      start_time: campaign.start_time || null,
      stop_time: campaign.stop_time || null,
      created_time: campaign.created_time,
      updated_time: campaign.updated_time
    }));

    const { error: campaignsError } = await supabase
      .from('campaigns')
      .upsert(campaigns);

    if (campaignsError) throw campaignsError;
    console.log(`✅ ${campaigns.length} campaigns loaded successfully`);

    // Test 4: Load recent insights
    console.log('\n📈 Loading insights data...');
    const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'spend,impressions,clicks,conversions,conversion_values,reach,frequency,date_start,date_stop',
        date_preset: 'last_7d',
        time_increment: 1
      }
    });

    // For now, we'll use the first campaign ID for the insights data
    const firstCampaignId = campaigns[0]?.id || 'unknown';
    
    const insights = insightsResponse.data.data.map(insight => ({
      date_start: insight.date_start,
      account_id: ACCOUNT_ID.replace('act_', ''),
      campaign_id: firstCampaignId,
      ad_set_id: 'placeholder_adset', // We'll need to fetch ad sets separately
      ad_id: 'placeholder_ad', // We'll need to fetch ads separately
      spend: parseFloat(insight.spend || 0),
      impressions: parseInt(insight.impressions || 0),
      clicks: parseInt(insight.clicks || 0),
      reach: parseInt(insight.reach || 0),
      frequency: parseFloat(insight.frequency || 0),
      conversions: parseFloat(insight.conversions || 0),
      conversion_values: parseFloat(insight.conversion_values || 0),
      cost_per_conversion: 0 // Will be calculated by the database
    }));

    if (insights.length > 0) {
      // First, create placeholder ad sets and ads
      const { error: adsetError } = await supabase
        .from('ad_sets')
        .upsert({
          id: 'placeholder_adset',
          campaign_id: firstCampaignId,
          account_id: ACCOUNT_ID.replace('act_', ''),
          name: 'Placeholder Ad Set',
          status: 'ACTIVE',
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString()
        });

      const { error: adError } = await supabase
        .from('ads')
        .upsert({
          id: 'placeholder_ad',
          ad_set_id: 'placeholder_adset',
          campaign_id: firstCampaignId,
          account_id: ACCOUNT_ID.replace('act_', ''),
          name: 'Placeholder Ad',
          status: 'ACTIVE',
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString()
        });

      if (adsetError) console.warn('Ad Set creation warning:', adsetError.message);
      if (adError) console.warn('Ad creation warning:', adError.message);

      // Now insert insights
      const { error: insightsError } = await supabase
        .from('daily_ad_insights')
        .upsert(insights);

      if (insightsError) throw insightsError;
      console.log(`✅ ${insights.length} insights records loaded successfully`);
    }

    // Test 5: Verify data with queries
    console.log('\n🔍 Verifying loaded data...');
    
    const { data: accountCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact' });
    console.log(`📊 Accounts in database: ${accountCount?.length || 0}`);

    const { data: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact' });
    console.log(`📊 Campaigns in database: ${campaignCount?.length || 0}`);

    const { data: insightCount } = await supabase
      .from('daily_ad_insights')
      .select('*', { count: 'exact' });
    console.log(`📊 Insights records in database: ${insightCount?.length || 0}`);

    // Show summary metrics
    if (insightCount && insightCount.length > 0) {
      const totalSpend = insightCount.reduce((sum, insight) => sum + parseFloat(insight.spend || 0), 0);
      const totalImpressions = insightCount.reduce((sum, insight) => sum + parseInt(insight.impressions || 0), 0);
      const totalClicks = insightCount.reduce((sum, insight) => sum + parseInt(insight.clicks || 0), 0);

      console.log('\n📈 Summary Metrics:');
      console.log(`   Total Spend: $${totalSpend.toFixed(2)}`);
      console.log(`   Total Impressions: ${totalImpressions.toLocaleString()}`);
      console.log(`   Total Clicks: ${totalClicks.toLocaleString()}`);
    }

    console.log('\n🎉 Supabase integration test successful!');
    console.log('✅ Your Meta data is now stored in Supabase and ready for the dashboard');

  } catch (error) {
    console.error('\n❌ Supabase test failed:');
    console.error('Error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

testSupabaseConnection();