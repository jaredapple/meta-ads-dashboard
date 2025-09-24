#!/usr/bin/env node

import { ETLService } from './etl-service';
import { testConnection } from '../database/client';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  try {
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('Database connection failed, exiting ETL');
      process.exit(1);
    }

    const etlService = new ETLService();
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // Run daily ETL for yesterday
      logger.info('Running daily ETL for yesterday');
      const stats = await etlService.runDailyETL();
      printStats(stats);
    } else if (args.length === 1) {
      // Run ETL for specific date
      const date = args[0];
      logger.info('Running ETL for specific date', { date });
      const stats = await etlService.runFullETL(date, date);
      printStats(stats);
    } else if (args.length === 2) {
      // Run ETL for date range
      const [dateStart, dateEnd] = args;
      logger.info('Running ETL for date range', { dateStart, dateEnd });
      const stats = await etlService.runDateRangeETL(dateStart, dateEnd);
      printStats(stats);
    } else {
      logger.error('Invalid arguments. Usage:');
      logger.error('  npm run etl                    # Run for yesterday');
      logger.error('  npm run etl 2025-01-01         # Run for specific date');
      logger.error('  npm run etl 2025-01-01 2025-01-31  # Run for date range');
      process.exit(1);
    }

    logger.info('ETL process completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('ETL process failed', error as Error);
    process.exit(1);
  }
}

function printStats(stats: any): void {
  logger.info('ETL Statistics', {
    accounts: stats.accountsProcessed,
    campaigns: stats.campaignsProcessed,
    adSets: stats.adSetsProcessed,
    ads: stats.adsProcessed,
    insights: stats.insightsProcessed,
    errors: stats.errors.length,
    duration: `${Math.round(stats.duration / 1000)}s`,
  });

  if (stats.errors.length > 0) {
    logger.warn('ETL completed with errors', {
      errorCount: stats.errors.length,
      errors: stats.errors,
    });
  }
}

if (require.main === module) {
  main();
}