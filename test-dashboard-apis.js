#!/usr/bin/env node

const baseUrl = 'http://localhost:3000';
const zenagen = '773006558299181'; // Zenagen account ID
const auraHouse = '183121914746855'; // Aura House account ID

async function testAPI(endpoint, accountId, description) {
  try {
    const url = `${baseUrl}${endpoint}&accountId=${accountId}`;
    console.log(`🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.summary?.totalSpend !== undefined) {
      console.log(`   ✅ Total Spend: $${data.summary.totalSpend.toLocaleString()}`);
      console.log(`   📊 Records: ${data.dailyData?.length || 'N/A'} days`);
    } else if (response.ok && data.metrics) {
      console.log(`   ✅ Has metrics data: ${Object.keys(data.metrics).join(', ')}`);
    } else if (response.ok) {
      console.log(`   ✅ Response received (check structure)`);
      console.log(`   📋 Keys: ${Object.keys(data).join(', ')}`);
    } else {
      console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
  console.log('');
}

async function testDashboardAPIs() {
  console.log('🧪 Testing Dashboard API Endpoints with Account Filtering');
  console.log('========================================================\n');
  
  console.log('📊 Testing with Zenagen Account (CST):');
  console.log('-------------------------------------');
  
  await testAPI('/api/metrics?period=last_n_days&days=7', zenagen, 'Main Metrics (Last 7 days)');
  await testAPI('/api/metrics/comparison?current_days=7&previous_days=7', zenagen, 'Period Comparison');
  await testAPI('/api/funnel?days=7', zenagen, 'Conversion Funnel');
  await testAPI('/api/time-insights?days=7', zenagen, 'Time Insights');
  await testAPI('/api/performers?days=7&metric=spend', zenagen, 'Top/Bottom Performers');
  await testAPI('/api/correlation?days=7', zenagen, 'ROAS Correlation');
  
  console.log('📊 Testing with Aura House Account (EST):');
  console.log('----------------------------------------');
  
  await testAPI('/api/metrics?period=last_n_days&days=7', auraHouse, 'Main Metrics (Last 7 days)');  
  await testAPI('/api/metrics/comparison?current_days=7&previous_days=7', auraHouse, 'Period Comparison');
  await testAPI('/api/funnel?days=7', auraHouse, 'Conversion Funnel');
  
  console.log('🎯 Summary:');
  console.log('----------');
  console.log('✅ APIs with accountId should show account-specific data');
  console.log('✅ Different accounts should show different totals');  
  console.log('✅ Timezone handling should be account-specific (CST vs EST)');
  console.log('');
  console.log('🚀 Next: Refresh your dashboard and check if all sections now show');
  console.log('   account-specific data that changes when you switch accounts!');
}

testDashboardAPIs().catch(console.error);