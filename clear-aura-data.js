#!/usr/bin/env node

const { StandardizedETLService } = require('./src/services/standardized-etl');

async function clearAuraData() {
  console.log('🗑️  Clearing existing Aura House data for fresh sync');
  console.log('==================================================\n');

  const etlService = new StandardizedETLService();
  
  try {
    // Get Aura House account
    const accounts = await etlService.getActiveAccounts();
    const auraAccount = accounts.find(acc => acc.client_name === 'Aura House');
    
    if (!auraAccount) {
      console.log('❌ Aura House account not found');
      return;
    }
    
    console.log(`📋 Found Aura House account: ${auraAccount.meta_account_id}`);
    
    // Delete existing insights data for Aura House (last 14 days to be safe)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const dateStart = cutoffDate.toISOString().split('T')[0];
    
    console.log(`🗑️  Deleting insights data from ${dateStart} onwards...`);
    
    const { error, count } = await etlService.supabase
      .from('daily_ad_insights')
      .delete()
      .eq('account_id', auraAccount.meta_account_id)
      .gte('date_start', dateStart);
    
    if (error) {
      console.error('❌ Error deleting data:', error);
    } else {
      console.log(`✅ Deleted existing data for fresh sync`);
    }
    
    console.log('\n📊 Ready for fresh ETL sync!');
    
  } catch (error) {
    console.error('❌ Clear data script failed:', error.message);
  }
}

clearAuraData().catch(console.error);