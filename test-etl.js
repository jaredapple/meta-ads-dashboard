#!/usr/bin/env node

// Simple test to verify ETL pipeline works with real Meta data
require('dotenv').config();
const axios = require('axios');

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ACCOUNT_ID;

console.log('🔄 Testing ETL Pipeline with Real Meta Data...\n');

async function testETL() {
  try {
    // Step 1: Fetch real campaigns
    console.log('📊 Fetching campaigns...');
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/campaigns`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,status,objective,created_time,daily_budget,lifetime_budget',
        limit: 10
      }
    });
    
    const campaigns = campaignsResponse.data.data;
    console.log(`✅ Retrieved ${campaigns.length} campaigns`);

    // Step 2: Fetch recent insights
    console.log('\n📈 Fetching insights data...');
    const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'spend,impressions,clicks,conversions,actions,action_values,date_start,date_stop',
        date_preset: 'last_7d',
        time_increment: 1
      }
    });
    
    const insights = insightsResponse.data.data;
    console.log(`✅ Retrieved ${insights.length} days of insights`);

    // Step 3: Process and display the data
    console.log('\n📋 Sample Data Processing:');
    console.log('Campaigns:');
    campaigns.slice(0, 3).forEach(campaign => {
      console.log(`  • ${campaign.name} (${campaign.status})`);
      console.log(`    Objective: ${campaign.objective}`);
      if (campaign.daily_budget) {
        console.log(`    Daily Budget: $${(campaign.daily_budget / 100).toFixed(2)}`);
      }
    });

    console.log('\nRecent Performance:');
    insights.slice(0, 5).forEach(insight => {
      const spend = parseFloat(insight.spend || 0);
      const impressions = parseInt(insight.impressions || 0);
      const clicks = parseInt(insight.clicks || 0);
      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
      
      console.log(`  • ${insight.date_start}: $${spend.toFixed(2)} spend, ${impressions.toLocaleString()} impressions, ${clicks} clicks (${ctr}% CTR)`);
    });

    // Step 4: Calculate summary metrics
    const totalSpend = insights.reduce((sum, insight) => sum + parseFloat(insight.spend || 0), 0);
    const totalImpressions = insights.reduce((sum, insight) => sum + parseInt(insight.impressions || 0), 0);
    const totalClicks = insights.reduce((sum, insight) => sum + parseInt(insight.clicks || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;

    console.log('\n📊 Summary (Last 7 Days):');
    console.log(`  Total Spend: $${totalSpend.toFixed(2)}`);
    console.log(`  Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`  Total Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`  Average CTR: ${avgCTR.toFixed(2)}%`);

    console.log('\n🎉 ETL pipeline test successful! Your Meta data is ready for integration.');

  } catch (error) {
    console.error('\n❌ ETL Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testETL();