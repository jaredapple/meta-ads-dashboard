import * as cron from 'node-cron';
import { ETLService, ETLStats } from '../etl/etl-service';
import { testConnection } from '../database/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SchedulerService {
  private etlService: ETLService;
  private scheduledTask: cron.ScheduledTask | null = null;

  constructor() {
    this.etlService = new ETLService();
  }

  async startScheduler(): Promise<void> {
    try {
      logger.info('Starting ETL scheduler', {
        schedule: env.app.etlSchedule,
        timezone: env.app.defaultTimezone,
      });

      // Validate cron expression
      if (!cron.validate(env.app.etlSchedule)) {
        throw new Error(`Invalid cron expression: ${env.app.etlSchedule}`);
      }

      // Test database connection before starting scheduler
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }

      this.scheduledTask = cron.schedule(
        env.app.etlSchedule,
        async () => {
          await this.runScheduledETL();
        },
        {
          timezone: env.app.defaultTimezone,
        }
      );

      logger.info('ETL scheduler started successfully', {
        nextRun: this.scheduledTask.getStatus(),
      });
    } catch (error) {
      logger.error('Failed to start ETL scheduler', error as Error);
      throw error;
    }
  }

  stopScheduler(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      logger.info('ETL scheduler stopped');
    }
  }

  private async runScheduledETL(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting scheduled ETL job');

    try {
      // Test database connection before running ETL
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed before ETL execution');
      }

      // Run ETL for yesterday's data (default behavior)
      const stats = await this.etlService.runDailyETL();
      
      const duration = Date.now() - startTime;
      const durationMinutes = Math.round(duration / 60000);

      logger.info('Scheduled ETL job completed successfully', {
        ...this.formatStats(stats),
        totalDurationMinutes: durationMinutes,
      });

      // Log summary for monitoring
      this.logETLSummary(stats, true, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      const durationMinutes = Math.round(duration / 60000);

      logger.error('Scheduled ETL job failed', error as Error, {
        totalDurationMinutes: durationMinutes,
      });

      // Log failure summary for monitoring
      this.logETLSummary(null, false, duration, error as Error);

      // Don't throw - we want the scheduler to continue running
      // The error is already logged for monitoring purposes
    }
  }

  private formatStats(stats: ETLStats): Record<string, any> {
    return {
      accountsProcessed: stats.accountsProcessed,
      campaignsProcessed: stats.campaignsProcessed,
      adSetsProcessed: stats.adSetsProcessed,
      adsProcessed: stats.adsProcessed,
      insightsProcessed: stats.insightsProcessed,
      errorCount: stats.errors.length,
      etlDurationMs: stats.duration,
      etlDurationMinutes: stats.duration ? Math.round(stats.duration / 60000) : 0,
    };
  }

  private logETLSummary(
    stats: ETLStats | null, 
    success: boolean, 
    totalDuration: number,
    error?: Error
  ): void {
    const summary = {
      timestamp: new Date().toISOString(),
      success,
      totalDurationMs: totalDuration,
      totalDurationMinutes: Math.round(totalDuration / 60000),
      error: error?.message,
      stats: stats ? this.formatStats(stats) : null,
    };

    if (success && stats) {
      logger.info('ETL_SUMMARY_SUCCESS', summary);
    } else {
      logger.error('ETL_SUMMARY_FAILURE', new Error('ETL failed'), summary);
    }
  }

  getSchedulerStatus(): {
    isRunning: boolean;
    schedule: string;
    timezone: string;
    nextRun?: string;
  } {
    return {
      isRunning: this.scheduledTask?.getStatus() === 'scheduled',
      schedule: env.app.etlSchedule,
      timezone: env.app.defaultTimezone,
      nextRun: this.scheduledTask ? 'Check cron schedule' : undefined,
    };
  }

  // Manual ETL trigger for testing or on-demand runs
  async runManualETL(dateStart?: string, dateEnd?: string): Promise<ETLStats> {
    logger.info('Starting manual ETL job', { dateStart, dateEnd });

    try {
      // Test database connection
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed before manual ETL execution');
      }

      let stats: ETLStats;

      if (!dateStart && !dateEnd) {
        // Run for yesterday if no dates provided
        stats = await this.etlService.runDailyETL();
      } else if (dateStart && !dateEnd) {
        // Run for single date
        stats = await this.etlService.runFullETL(dateStart, dateStart);
      } else if (dateStart && dateEnd) {
        // Run for date range
        stats = await this.etlService.runDateRangeETL(dateStart, dateEnd);
      } else {
        throw new Error('Invalid date parameters for manual ETL');
      }

      logger.info('Manual ETL job completed successfully', this.formatStats(stats));
      return stats;
    } catch (error) {
      logger.error('Manual ETL job failed', error as Error, { dateStart, dateEnd });
      throw error;
    }
  }
}

// Graceful shutdown handler
export function setupGracefulShutdown(scheduler: SchedulerService): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    scheduler.stopScheduler();
    
    // Give some time for cleanup
    setTimeout(() => {
      logger.info('Scheduler service stopped, exiting');
      process.exit(0);
    }, 1000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR1', () => shutdown('SIGUSR1'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));
}