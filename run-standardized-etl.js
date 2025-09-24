#!/usr/bin/env node

const { StandardizedETLService } = require('./src/services/standardized-etl');

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let daysBack = 3; // Default to 3 days for near real-time updates
  
  // Check for days parameter
  if (args[0] === '--days' && args[1]) {
    daysBack = parseInt(args[1]);
    if (isNaN(daysBack) || daysBack < 1) {
      console.error('Invalid days parameter. Must be a positive number.');
      process.exit(1);
    }
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node run-standardized-etl.js [options]');
    console.log('Options:');
    console.log('  --days <number>  Number of days to sync (default: 3)');
    console.log('  --help, -h       Show this help message');
    console.log('\nExamples:');
    console.log('  node run-standardized-etl.js           # Sync last 3 days (default)');
    console.log('  node run-standardized-etl.js --days 7  # Sync last 7 days');
    console.log('  node run-standardized-etl.js --days 1  # Sync yesterday only');
    process.exit(0);
  }

  console.log('🔄 Meta Ads Standardized ETL Service');
  console.log('====================================');
  console.log(`📅 Syncing last ${daysBack} day(s) of data\n`);

  const etlService = new StandardizedETLService();
  
  try {
    await etlService.syncAllAccounts(daysBack);
    console.log('\n✅ ETL process completed successfully');
    console.log(`📊 Synced ${daysBack} day(s) of data for all accounts`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ETL process failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  ETL process interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  ETL process terminated');
  process.exit(1);
});

main().catch(console.error);