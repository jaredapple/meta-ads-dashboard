import { MetaApiClient, MetaApiCredentials } from '../services/meta-api';
import { DataService } from '../services/data-service';
import { DataTransformer, TransformedInsight } from '../services/data-transformer';
import { ClientAccountService } from '../services/client-account-service';
import { ClientAccount } from '../database/client-types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Database } from '../database/types';

export interface AccountETLStats {
  accountId: string;
  accountName: string;
  campaignsProcessed: number;
  adSetsProcessed: number;
  adsProcessed: number;
  insightsProcessed: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
}

export interface MultiAccountETLStats {
  totalAccountsProcessed: number;
  totalCampaignsProcessed: number;
  totalAdSetsProcessed: number;
  totalAdsProcessed: number;
  totalInsightsProcessed: number;
  accountStats: AccountETLStats[];
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export class MultiAccountETLService {
  private dataService: DataService;
  private clientAccountService: ClientAccountService;

  constructor() {
    this.dataService = new DataService();
    this.clientAccountService = new ClientAccountService();
  }

  /**
   * Run ETL for all active client accounts
   */
  async runFullETLForAllAccounts(dateStart: string, dateEnd: string): Promise<MultiAccountETLStats> {
    const stats: MultiAccountETLStats = {
      totalAccountsProcessed: 0,
      totalCampaignsProcessed: 0,
      totalAdSetsProcessed: 0,
      totalAdsProcessed: 0,
      totalInsightsProcessed: 0,
      accountStats: [],
      errors: [],
      startTime: new Date(),
    };

    try {
      logger.info('Starting multi-account ETL process', { dateStart, dateEnd });

      // Get all active client accounts
      const activeAccounts = await this.clientAccountService.getActiveAccounts();
      
      if (activeAccounts.length === 0) {
        logger.warn('No active client accounts found');
        stats.errors.push('No active client accounts found');
        return stats;
      }

      logger.info(`Found ${activeAccounts.length} active accounts to process`);

      // Process each account
      for (const accountSummary of activeAccounts) {
        try {
          // Get full account details with decrypted token
          const account = await this.clientAccountService.getAccountById(accountSummary.id);
          
          if (!account) {
            logger.error(`Could not load account details for ${accountSummary.client_name}`);
            continue;
          }

          // Update sync status to syncing
          await this.clientAccountService.updateSyncStatus(account.id, 'syncing');

          // Process this account
          const accountStats = await this.processAccount(account, dateStart, dateEnd);
          
          stats.accountStats.push(accountStats);
          stats.totalAccountsProcessed++;
          stats.totalCampaignsProcessed += accountStats.campaignsProcessed;
          stats.totalAdSetsProcessed += accountStats.adSetsProcessed;
          stats.totalAdsProcessed += accountStats.adsProcessed;
          stats.totalInsightsProcessed += accountStats.insightsProcessed;

          // Update sync status based on result
          if (accountStats.success) {
            await this.clientAccountService.updateSyncStatus(account.id, 'success');
          } else {
            await this.clientAccountService.updateSyncStatus(
              account.id, 
              'failed', 
              accountStats.errors.join('; ')
            );
          }
        } catch (error) {
          const errorMsg = `Failed to process account ${accountSummary.client_name}: ${(error as Error).message}`;
          stats.errors.push(errorMsg);
          logger.error(errorMsg, error as Error);
          
          // Update sync status for failed account
          if (accountSummary.id) {
            await this.clientAccountService.updateSyncStatus(
              accountSummary.id, 
              'failed', 
              (error as Error).message
            );
          }
        }
      }

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Multi-account ETL process completed', {
        ...stats,
        durationMinutes: Math.round(stats.duration / 60000),
      });

      return stats;
    } catch (error) {
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.errors.push(`Fatal multi-account ETL error: ${(error as Error).message}`);
      
      logger.error('Multi-account ETL process failed', error as Error, stats);
      throw error;
    }
  }

  /**
   * Process a single client account
   */
  private async processAccount(
    account: ClientAccount, 
    dateStart: string, 
    dateEnd: string
  ): Promise<AccountETLStats> {
    const stats: AccountETLStats = {
      accountId: account.meta_account_id,
      accountName: account.client_name,
      campaignsProcessed: 0,
      adSetsProcessed: 0,
      adsProcessed: 0,
      insightsProcessed: 0,
      errors: [],
      startTime: new Date(),
      success: false,
    };

    try {
      logger.info(`Processing account: ${account.client_name}`, { 
        accountId: account.meta_account_id 
      });

      // Create API client with account-specific credentials
      const metaClient = new MetaApiClient({
        accountId: account.meta_account_id,
        accessToken: account.access_token
      });

      // Step 1: Process account information
      await this.processAccountInfo(metaClient, account, stats);

      // Step 2: Process campaigns
      const campaigns = await this.processCampaigns(metaClient, account, stats);

      // Step 3: Process ad sets
      const adSets = await this.processAdSets(metaClient, campaigns, account, stats);

      // Step 4: Process ads
      const ads = await this.processAds(metaClient, adSets, account, stats);

      // Step 5: Process insights
      await this.processInsights(metaClient, account, dateStart, dateEnd, stats);

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.success = true;

      logger.info(`Account ${account.client_name} processed successfully`, {
        ...stats,
        durationSeconds: Math.round(stats.duration / 1000),
      });

      return stats;
    } catch (error) {
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.errors.push(`Account processing error: ${(error as Error).message}`);
      stats.success = false;
      
      logger.error(`Failed to process account ${account.client_name}`, error as Error, stats);
      return stats;
    }
  }

  private async processAccountInfo(
    metaClient: MetaApiClient,
    clientAccount: ClientAccount,
    stats: AccountETLStats
  ): Promise<void> {
    try {
      logger.info('Processing account info', { accountId: clientAccount.meta_account_id });

      const accountInfo = await metaClient.getAccountInfo();
      
      const account: Database['public']['Tables']['accounts']['Insert'] = {
        id: accountInfo.id.replace('act_', ''), // Remove act_ prefix
        name: accountInfo.name,
        currency: accountInfo.currency || clientAccount.currency,
        timezone: accountInfo.timezone_name || clientAccount.timezone,
        business_id: clientAccount.business_id,
      };

      await this.dataService.upsertAccount(account);

      logger.info('Account info processed successfully', { accountId: account.id });
    } catch (error) {
      const errorMsg = `Failed to process account info: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  private async processCampaigns(
    metaClient: MetaApiClient,
    clientAccount: ClientAccount,
    stats: AccountETLStats
  ): Promise<any[]> {
    try {
      logger.info('Processing campaigns', { accountId: clientAccount.meta_account_id });

      const campaignsResponse = await metaClient.getCampaigns();
      const campaigns = campaignsResponse.data || [];

      for (const campaign of campaigns) {
        const transformedCampaign: Database['public']['Tables']['campaigns']['Insert'] = {
          id: campaign.id,
          account_id: clientAccount.meta_account_id,
          name: campaign.name,
          objective: this.mapObjective(campaign.objective),
          status: this.mapStatus(campaign.status),
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          start_time: campaign.start_time || null,
          stop_time: campaign.stop_time || null,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time,
        };

        await this.dataService.upsertCampaign(transformedCampaign);
        stats.campaignsProcessed++;
      }

      logger.info(`Processed ${campaigns.length} campaigns`, { 
        accountId: clientAccount.meta_account_id 
      });
      return campaigns;
    } catch (error) {
      const errorMsg = `Failed to process campaigns: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      return [];
    }
  }

  private async processAdSets(
    metaClient: MetaApiClient,
    campaigns: any[],
    clientAccount: ClientAccount,
    stats: AccountETLStats
  ): Promise<any[]> {
    const allAdSets: any[] = [];

    try {
      logger.info('Processing ad sets', { accountId: clientAccount.meta_account_id });

      for (const campaign of campaigns) {
        try {
          const adSetsResponse = await metaClient.getAdSets(campaign.id);
          const adSets = adSetsResponse.data || [];

          for (const adSet of adSets) {
            const transformedAdSet: Database['public']['Tables']['ad_sets']['Insert'] = {
              id: adSet.id,
              campaign_id: campaign.id,
              account_id: clientAccount.meta_account_id,
              name: adSet.name,
              status: this.mapStatus(adSet.status),
              daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
              lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
              bid_amount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : null,
              optimization_goal: adSet.optimization_goal || null,
              billing_event: adSet.billing_event || null,
              start_time: adSet.start_time || null,
              end_time: adSet.end_time || null,
              created_time: adSet.created_time,
              updated_time: adSet.updated_time,
            };

            await this.dataService.upsertAdSet(transformedAdSet);
            stats.adSetsProcessed++;
            allAdSets.push(adSet);
          }
        } catch (error) {
          logger.error(`Failed to process ad sets for campaign ${campaign.id}`, error as Error);
        }
      }

      logger.info(`Processed ${allAdSets.length} ad sets`, { 
        accountId: clientAccount.meta_account_id 
      });
      return allAdSets;
    } catch (error) {
      const errorMsg = `Failed to process ad sets: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      return allAdSets;
    }
  }

  private async processAds(
    metaClient: MetaApiClient,
    adSets: any[],
    clientAccount: ClientAccount,
    stats: AccountETLStats
  ): Promise<any[]> {
    const allAds: any[] = [];

    try {
      logger.info('Processing ads', { accountId: clientAccount.meta_account_id });

      for (const adSet of adSets) {
        try {
          const adsResponse = await metaClient.getAds(adSet.id);
          const ads = adsResponse.data || [];

          for (const ad of ads) {
            const transformedAd: Database['public']['Tables']['ads']['Insert'] = {
              id: ad.id,
              ad_set_id: adSet.id,
              campaign_id: adSet.campaign_id,
              account_id: clientAccount.meta_account_id,
              name: ad.name,
              status: this.mapAdStatus(ad.status),
              creative_id: ad.creative?.id || null,
              created_time: ad.created_time,
              updated_time: ad.updated_time,
            };

            await this.dataService.upsertAd(transformedAd);
            stats.adsProcessed++;
            allAds.push(ad);
          }
        } catch (error) {
          logger.error(`Failed to process ads for ad set ${adSet.id}`, error as Error);
        }
      }

      logger.info(`Processed ${allAds.length} ads`, { 
        accountId: clientAccount.meta_account_id 
      });
      return allAds;
    } catch (error) {
      const errorMsg = `Failed to process ads: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      return allAds;
    }
  }

  private async processInsights(
    metaClient: MetaApiClient,
    clientAccount: ClientAccount,
    dateStart: string,
    dateEnd: string,
    stats: AccountETLStats
  ): Promise<void> {
    try {
      logger.info('Processing insights', { 
        accountId: clientAccount.meta_account_id,
        dateStart,
        dateEnd
      });

      const insights = await metaClient.getAllInsights(undefined, {
        dateStart,
        dateEnd,
        level: 'ad'
      });

      const transformer = new DataTransformer();
      const transformedInsights = transformer.transformInsights(insights);

      for (const insight of transformedInsights) {
        await this.dataService.upsertDailyInsight(insight);
        stats.insightsProcessed++;
      }

      logger.info(`Processed ${transformedInsights.length} insights`, { 
        accountId: clientAccount.meta_account_id 
      });
    } catch (error) {
      const errorMsg = `Failed to process insights: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
    }
  }

  // Helper methods for mapping Meta API values to database enums
  private mapObjective(objective: string): Database['public']['Enums']['campaign_objective'] {
    const objectiveMap: Record<string, Database['public']['Enums']['campaign_objective']> = {
      'OUTCOME_AWARENESS': 'OUTCOME_AWARENESS',
      'OUTCOME_TRAFFIC': 'OUTCOME_TRAFFIC',
      'OUTCOME_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
      'OUTCOME_LEADS': 'OUTCOME_LEADS',
      'OUTCOME_APP_PROMOTION': 'OUTCOME_APP_PROMOTION',
      'OUTCOME_SALES': 'OUTCOME_SALES',
    };
    return objectiveMap[objective] || 'OUTCOME_TRAFFIC';
  }

  private mapStatus(status: string): Database['public']['Enums']['campaign_status'] {
    const statusMap: Record<string, Database['public']['Enums']['campaign_status']> = {
      'ACTIVE': 'ACTIVE',
      'PAUSED': 'PAUSED',
      'DELETED': 'DELETED',
      'ARCHIVED': 'ARCHIVED',
    };
    return statusMap[status] || 'PAUSED';
  }

  private mapAdStatus(status: string): Database['public']['Enums']['ad_status'] {
    const statusMap: Record<string, Database['public']['Enums']['ad_status']> = {
      'ACTIVE': 'ACTIVE',
      'PAUSED': 'PAUSED',
      'DELETED': 'DELETED',
      'ARCHIVED': 'ARCHIVED',
      'PENDING_REVIEW': 'PENDING_REVIEW',
      'DISAPPROVED': 'DISAPPROVED',
      'PREAPPROVED': 'PREAPPROVED',
      'PENDING_BILLING_INFO': 'PENDING_BILLING_INFO',
      'CAMPAIGN_PAUSED': 'CAMPAIGN_PAUSED',
      'ADSET_PAUSED': 'ADSET_PAUSED',
    };
    return statusMap[status] || 'PAUSED';
  }
}

// Singleton instance
let multiAccountETLService: MultiAccountETLService | null = null;

export function getMultiAccountETLService(): MultiAccountETLService {
  if (!multiAccountETLService) {
    multiAccountETLService = new MultiAccountETLService();
  }
  return multiAccountETLService;
}