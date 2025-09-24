#!/usr/bin/env node

const { StandardizedETLService } = require('./src/services/standardized-etl');

async function checkDatabaseOnly() {
  console.log('💾 Checking Database Content After ETL Fix');
  console.log('===========================================\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get Aura House account
    const accounts = await etlService.getActiveAccounts();
    const account = accounts.find(acc => acc.client_name === 'Aura House');
    
    if (!account) {
      console.log('❌ Aura House account not found');
      return;
    }
    
    // Check database content for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Date Range: ${dateStart} to ${dateEnd} (7 days)`);
    console.log(`🏢 Account: ${account.client_name} (${account.meta_account_id})\n`);
    
    const { data: dbInsights, error } = await etlService.supabase
      .from('daily_ad_insights')
      .select('date_start, spend, impressions, clicks, link_clicks, conversions, conversion_values, ctr, cpc')
      .eq('account_id', account.meta_account_id)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)
      .order('date_start', { ascending: true });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Database records count: ${dbInsights.length}\n`);
    
    let dbTotalSpend = 0;
    let dbTotalClicks = 0;
    let dbTotalLinkClicks = 0;
    let dbTotalImpressions = 0;
    let dbTotalConversions = 0;
    let dbTotalConversionValue = 0;
    
    console.log('📋 Daily Database Records:');
    const dailyTotals = {};
    
    dbInsights.forEach(row => {
      const date = row.date_start;
      if (!dailyTotals[date]) {
        dailyTotals[date] = { 
          spend: 0, impressions: 0, clicks: 0, link_clicks: 0, 
          conversions: 0, conversion_values: 0
        };
      }
      
      dailyTotals[date].spend += parseFloat(row.spend || 0);
      dailyTotals[date].impressions += parseInt(row.impressions || 0);
      dailyTotals[date].clicks += parseInt(row.clicks || 0);
      dailyTotals[date].link_clicks += parseInt(row.link_clicks || 0);
      dailyTotals[date].conversions += parseFloat(row.conversions || 0);
      dailyTotals[date].conversion_values += parseFloat(row.conversion_values || 0);
      
      dbTotalSpend += parseFloat(row.spend || 0);
      dbTotalClicks += parseInt(row.clicks || 0);
      dbTotalLinkClicks += parseInt(row.link_clicks || 0);
      dbTotalImpressions += parseInt(row.impressions || 0);
      dbTotalConversions += parseFloat(row.conversions || 0);
      dbTotalConversionValue += parseFloat(row.conversion_values || 0);
    });
    
    Object.keys(dailyTotals).sort().forEach(date => {
      const day = dailyTotals[date];
      console.log(`  ${date}:`);
      console.log(`    Spend: $${day.spend.toFixed(2)}`);
      console.log(`    Impressions: ${day.impressions.toLocaleString()}`);
      console.log(`    Clicks: ${day.clicks.toLocaleString()}`);
      console.log(`    Link Clicks: ${day.link_clicks.toLocaleString()}`);
      console.log(`    Conversions: ${day.conversions.toFixed(2)}`);
      console.log(`    Conversion Values: $${day.conversion_values.toFixed(2)}`);
      console.log('');
    });
    
    console.log('🎯 DATABASE TOTALS (7 days):');
    console.log(`  Total Spend: $${dbTotalSpend.toFixed(2)}`);
    console.log(`  Total Impressions: ${dbTotalImpressions.toLocaleString()}`);
    console.log(`  Total Clicks: ${dbTotalClicks.toLocaleString()}`);
    console.log(`  Total Link Clicks: ${dbTotalLinkClicks.toLocaleString()}`);
    console.log(`  Total Conversions: ${dbTotalConversions.toFixed(2)}`);
    console.log(`  Total Conversion Value: $${dbTotalConversionValue.toFixed(2)}`);
    console.log(`  Calculated CTR: ${dbTotalImpressions > 0 ? ((dbTotalLinkClicks / dbTotalImpressions) * 100).toFixed(4) : 0}%`);
    console.log(`  Calculated CPC: $${dbTotalLinkClicks > 0 ? (dbTotalSpend / dbTotalLinkClicks).toFixed(4) : 0}`);
    console.log(`  Calculated ROAS: ${dbTotalSpend > 0 ? (dbTotalConversionValue / dbTotalSpend).toFixed(4) : 0}`);
    
    console.log('\n🎉 Data check complete!');
    
    // Quick comparison
    console.log('\n📈 EXPECTED vs ACTUAL:');
    console.log(`  Expected Spend (Meta API): $28,293.47`);
    console.log(`  Actual Spend (Database):   $${dbTotalSpend.toFixed(2)}`);
    console.log(`  Accuracy: ${dbTotalSpend > 25000 ? '✅ MUCH IMPROVED!' : dbTotalSpend > 20000 ? '🔶 Better but needs work' : '❌ Still inaccurate'}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabaseOnly().catch(console.error);