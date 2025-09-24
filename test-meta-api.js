#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ACCOUNT_ID;

console.log('🔍 Testing Meta API Connection...');
console.log(`📱 App ID: ${process.env.META_APP_ID}`);
console.log(`🎯 Account ID: ${ACCOUNT_ID}`);
console.log(`🔑 Access Token: ${ACCESS_TOKEN ? ACCESS_TOKEN.substring(0, 20) + '...' : 'Not found'}`);

async function testMetaAPI() {
  try {
    // Test 1: Verify the access token
    console.log('\n📡 Testing access token validity...');
    const tokenResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name'
      }
    });
    console.log('✅ Access token valid for user:', tokenResponse.data.name);

    // Test 2: Get account information
    console.log('\n🏢 Testing ad account access...');
    const accountResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,account_status,currency,timezone_name,business_name'
      }
    });
    console.log('✅ Ad Account Details:');
    console.log(`   Name: ${accountResponse.data.name}`);
    console.log(`   Status: ${accountResponse.data.account_status}`);
    console.log(`   Currency: ${accountResponse.data.currency}`);
    console.log(`   Timezone: ${accountResponse.data.timezone_name}`);
    if (accountResponse.data.business_name) {
      console.log(`   Business: ${accountResponse.data.business_name}`);
    }

    // Test 3: Get campaigns
    console.log('\n📊 Testing campaigns access...');
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/campaigns`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,status,objective,created_time',
        limit: 5
      }
    });
    
    const campaigns = campaignsResponse.data.data;
    console.log(`✅ Found ${campaigns.length} campaigns (showing first 5):`);
    campaigns.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.name} (${campaign.status}) - ${campaign.objective}`);
    });

    // Test 4: Get insights data
    console.log('\n📈 Testing insights access...');
    const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'spend,impressions,clicks,date_start,date_stop',
        date_preset: 'last_7d',
        time_increment: 1,
        limit: 3
      }
    });
    
    const insights = insightsResponse.data.data;
    console.log(`✅ Retrieved ${insights.length} days of insights data:`);
    insights.forEach(insight => {
      console.log(`   ${insight.date_start}: $${insight.spend} spend, ${insight.impressions} impressions, ${insight.clicks} clicks`);
    });

    console.log('\n🎉 All Meta API tests passed! Your credentials are working correctly.');
    console.log('✅ Ready to proceed with data integration.');

  } catch (error) {
    console.error('\n❌ Meta API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      if (error.response.status === 400) {
        console.error('\n💡 This usually means:');
        console.error('   - Invalid access token or expired token');
        console.error('   - Missing required permissions');
        console.error('   - Invalid account ID format');
      }
    } else {
      console.error('Network Error:', error.message);
    }
    process.exit(1);
  }
}

testMetaAPI();