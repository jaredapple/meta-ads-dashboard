#!/usr/bin/env node

async function testTimePeriods() {
  console.log('🕐 Testing Time Period API Endpoints');
  console.log('====================================\n');
  
  const baseUrl = 'http://localhost:3000'; // Dashboard running on 3000
  const accountId = '183121914746855'; // Aura House
  
  const testCases = [
    { period: 'today', days: 1, label: 'Today' },
    { period: 'yesterday', days: 1, label: 'Yesterday' },
    { period: 'last_n_days', days: 7, label: 'Last 7 days' },
    { period: 'last_n_days', days: 14, label: 'Last 14 days' },
    { period: 'last_n_days', days: 30, label: 'Last 30 days' },
  ];
  
  for (const testCase of testCases) {
    console.log(`📊 Testing: ${testCase.label}`);
    console.log(`   Parameters: period=${testCase.period}, days=${testCase.days}`);
    
    try {
      const url = `${baseUrl}/api/metrics?period=${testCase.period}&days=${testCase.days}&accountId=${accountId}`;
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Total Spend: $${data.summary.totalSpend.toFixed(2)}`);
        console.log(`   📅 Date Range: ${data.period.dateStart} to ${data.period.dateEnd}`);
        console.log(`   📈 Records: ${data.dailyData.length} days`);
        
        // Show first few dates for verification
        if (data.dailyData.length > 0) {
          const dates = data.dailyData.map(d => d.date).slice(0, 3);
          console.log(`   📋 Sample dates: ${dates.join(', ')}${data.dailyData.length > 3 ? '...' : ''}`);
        }
      } else {
        console.log(`   ❌ Error: ${data.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Key Verification Points (Account Timezone: EST):');
  console.log('- Check dates match account timezone (EST), not hardcoded PST');
  console.log('- "Today" and "Yesterday" should reflect EST timezone');
  console.log('- "Last N days" should exclude today in EST timezone');
  console.log('- Different periods should return different spend amounts');
  console.log('');
  console.log('🕰️ Current time in different timezones:');
  console.log(`- PST: ${new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"})}`);
  console.log(`- EST: ${new Date().toLocaleString("en-US", {timeZone: "America/New_York"})}`);
  console.log(`- UTC: ${new Date().toLocaleString("en-US", {timeZone: "UTC"})}`);
}

testTimePeriods().catch(console.error);