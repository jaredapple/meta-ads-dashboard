const { StandardizedETLService } = require('./src/services/standardized-etl');

async function testETL() {
  const etl = new StandardizedETLService();
  
  console.log('Testing account fetching...');
  const accounts = await etl.getActiveAccounts();
  console.log(`Found ${accounts.length} accounts:`);
  
  accounts.forEach(acc => {
    console.log(`- ${acc.client_name} (${acc.meta_account_id})`);
  });
  
  console.log('\nTesting insights sync for first account...');
  if (accounts.length > 0) {
    await etl.syncInsightsData(accounts[0]);
    await etl.updateComputedMetrics(accounts[0]);
    console.log('✅ Test completed');
  }
}

testETL().catch(console.error);