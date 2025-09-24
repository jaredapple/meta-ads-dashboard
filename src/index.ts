#!/usr/bin/env node

import { logger } from './utils/logger';
import { env } from './config/env';
import { SchedulerService, setupGracefulShutdown } from './services/scheduler';
import { testConnection } from './database/client';
import MetaMCPServer from './mcp/server';

async function main(): Promise<void> {
  try {
    logger.info('Meta MCP Application starting...', {
      nodeEnv: env.app.nodeEnv,
      version: env.mcp.serverVersion,
    });

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'mcp':
        // Start MCP server
        logger.info('Starting MCP server mode');
        const mcpServer = new MetaMCPServer();
        await mcpServer.start();
        break;

      case 'scheduler':
        // Start ETL scheduler
        logger.info('Starting ETL scheduler mode');
        const scheduler = new SchedulerService();
        setupGracefulShutdown(scheduler);
        await scheduler.startScheduler();
        
        // Keep the process alive
        process.on('SIGINT', () => {
          logger.info('Received SIGINT, shutting down scheduler');
          scheduler.stopScheduler();
          process.exit(0);
        });
        break;

      case 'etl':
        // Run ETL once (handled by etl/index.ts)
        logger.info('Use "npm run etl" to run ETL pipeline');
        break;

      case 'seed':
        // Seed database (handled by scripts/seed.ts)
        logger.info('Use "npm run seed" to populate database with test data');
        break;

      default:
        logger.info('Meta MCP Application - Available modes:');
        logger.info('  node dist/index.js mcp        # Start MCP server');
        logger.info('  node dist/index.js scheduler  # Start ETL scheduler');
        logger.info('  npm run etl                   # Run ETL pipeline');
        logger.info('  npm run seed                  # Seed test data');
        logger.info('  npm run mcp                   # Start MCP server (shortcut)');
        break;
    }

  } catch (error) {
    logger.error('Failed to start Meta MCP Application', error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;