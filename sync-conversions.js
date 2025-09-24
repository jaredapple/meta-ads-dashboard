const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = 'EAAOHRZBAgxEsBPOT90SjZCaEhbRQZACGrH1AZB5rgvZA1Al6v1NhmUSKBzKi1I5UlfYuQiVCbF8OrGNqitv3eIAK5Gn8LmlpPWR7ZAAXuwbn53fNSFA4vE6A1EcqokQ2XB2ng2zNDSNGUhM1UOgQS558JsENye42O7xFp8jwOBjpca7YrXgWv3ZCQhj9HyFUjZCCAHF1yhE7MIYcn9ZAe7ditc9RyQZCpIZBDqqXITbLPx6rQZDZD';

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  { id: '183121914746855', name: 'Aura House' },
  { id: '19684614', name: 'Pair of Thieves' },
  { id: '773006558299181', name: 'Zenagen' }
];

async function getConversionData(accountId, accountName) {
  console.log(`\n=== Getting Conversion Data for ${accountName} ===`);
  
  try {
    // Get insights with conversion actions
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`Date range: ${dateStart} to ${dateEnd}`);
    
    // Try to get conversion data with actions breakdown
    const insightsResponse = await axios.get(`https://graph.facebook.com/v21.0/act_${accountId}/insights`, {
      params: {
        access_token: accessToken,
        level: 'account',
        fields: 'impressions,clicks,spend,actions,action_values,purchase_roas', 
        time_range: JSON.stringify({
          since: dateStart,
          until: dateEnd
        }),
        time_increment: 1,
        limit: 100
      }
    });
    
    const insights = insightsResponse.data.data || [];
    console.log(`Found ${insights.length} insights with conversion data`);
    
    if (insights.length === 0) {
      console.log('⚠️  No conversion insights available');
      return;
    }
    
    // Process each day's data
    for (const insight of insights) {
      console.log(`\nProcessing ${insight.date_start}:`);
      console.log(`  Spend: $${insight.spend}`);
      console.log(`  Impressions: ${insight.impressions}`);
      console.log(`  Clicks: ${insight.clicks}`);
      
      // Parse actions (conversions)
      let totalConversions = 0;
      let totalConversionValue = 0;
      let purchaseROAS = 0;
      
      if (insight.actions && Array.isArray(insight.actions)) {
        console.log('  Actions found:');
        insight.actions.forEach(action => {
          console.log(`    ${action.action_type}: ${action.value}`);
          
          // Count relevant conversion actions
          if (['purchase', 'complete_registration', 'lead', 'add_to_cart'].includes(action.action_type)) {
            totalConversions += parseFloat(action.value || 0);
          }
        });
      }
      
      if (insight.action_values && Array.isArray(insight.action_values)) {
        console.log('  Action values found:');
        insight.action_values.forEach(actionValue => {
          console.log(`    ${actionValue.action_type}: $${actionValue.value}`);
          
          // Count purchase values
          if (actionValue.action_type === 'purchase') {
            totalConversionValue += parseFloat(actionValue.value || 0);
          }
        });
      }
      
      if (insight.purchase_roas && Array.isArray(insight.purchase_roas)) {
        purchaseROAS = parseFloat(insight.purchase_roas[0]?.value || 0);
        console.log(`  Purchase ROAS: ${purchaseROAS}`);
      }
      
      console.log(`  Total Conversions: ${totalConversions}`);
      console.log(`  Total Conversion Value: $${totalConversionValue}`);
      
      // Update the database record with conversion data
      if (totalConversions > 0 || totalConversionValue > 0) {
        const updates = {
          conversions: totalConversions,
          conversion_values: totalConversionValue
        };
        
        // Calculate ROAS if we have conversion value and spend
        if (totalConversionValue > 0 && parseFloat(insight.spend) > 0) {
          updates.roas = parseFloat((totalConversionValue / parseFloat(insight.spend)).toFixed(4));
        }
        
        const { error: updateError } = await supabase
          .from('daily_ad_insights')
          .update(updates)
          .eq('account_id', accountId)
          .eq('date_start', insight.date_start);
          
        if (updateError) {
          console.error('Error updating conversion data:', updateError);
        } else {
          console.log(`  ✅ Updated conversion data (ROAS: ${updates.roas || 0})`);
        }
      } else {
        console.log('  ℹ️  No conversion data to update');
      }
    }
    
  } catch (error) {
    console.error(`❌ Error getting conversion data for ${accountName}:`, error.response?.data || error.message);
  }
}

async function syncAllConversions() {
  console.log('🎯 SYNCING CONVERSION DATA FOR ALL ACCOUNTS');
  
  for (const account of accounts) {
    await getConversionData(account.id, account.name);
    
    console.log('\nWaiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Conversion data sync complete!');
  
  // Show final results
  console.log('\n📊 FINAL ROAS SUMMARY:');
  
  for (const account of accounts) {
    const { data } = await supabase
      .from('daily_ad_insights')
      .select('spend, conversion_values, roas')
      .eq('account_id', account.id)
      .gt('roas', 0)
      .order('roas', { ascending: false })
      .limit(1);
      
    if (data && data.length > 0) {
      const record = data[0];
      console.log(`${account.name}: Best ROAS = ${record.roas} (Spend: $${record.spend}, Revenue: $${record.conversion_values})`);
    } else {
      console.log(`${account.name}: No conversion data found`);
    }
  }
}

syncAllConversions().catch(console.error);