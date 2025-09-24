import { MetaApiClient } from '../services/meta-api';
import { DataService } from '../services/data-service';
import { DataTransformer, TransformedInsight } from '../services/data-transformer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Database } from '../database/types';

export interface ETLStats {
  accountsProcessed: number;
  campaignsProcessed: number;
  adSetsProcessed: number;
  adsProcessed: number;
  insightsProcessed: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export class ETLService {
  private metaClient: MetaApiClient;
  private dataService: DataService;

  constructor() {
    this.metaClient = new MetaApiClient();
    this.dataService = new DataService();
  }

  async runFullETL(dateStart: string, dateEnd: string): Promise<ETLStats> {
    const stats: ETLStats = {
      accountsProcessed: 0,
      campaignsProcessed: 0,
      adSetsProcessed: 0,
      adsProcessed: 0,
      insightsProcessed: 0,
      errors: [],
      startTime: new Date(),
    };

    try {
      logger.info('Starting full ETL process', { dateStart, dateEnd });

      // Step 1: Process account information
      await this.processAccount(env.meta.accountId, stats);

      // Step 2: Process campaigns
      const campaigns = await this.processCampaigns(env.meta.accountId, stats);

      // Step 3: Process ad sets
      const adSets = await this.processAdSets(campaigns, stats);

      // Step 4: Process ads
      const ads = await this.processAds(adSets, stats);

      // Step 5: Process insights
      await this.processInsights(env.meta.accountId, dateStart, dateEnd, stats);

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('ETL process completed successfully', {
        ...stats,
        durationMinutes: Math.round(stats.duration / 60000),
      });

      return stats;
    } catch (error) {
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.errors.push(`Fatal ETL error: ${(error as Error).message}`);
      
      logger.error('ETL process failed', error as Error, stats);
      throw error;
    }
  }

  private async processAccount(accountId: string, stats: ETLStats): Promise<void> {
    try {
      logger.info('Processing account', { accountId });

      const accountInfo = await this.metaClient.getAccountInfo(accountId);
      
      const account: Database['public']['Tables']['accounts']['Insert'] = {
        id: accountInfo.id.replace('act_', ''), // Remove act_ prefix
        name: accountInfo.name,
        currency: accountInfo.currency || env.app.defaultCurrency,
        timezone: accountInfo.timezone_name || env.app.defaultTimezone,
        business_id: undefined, // Business ID requires additional permissions
      };

      await this.dataService.upsertAccount(account);
      stats.accountsProcessed++;

      logger.info('Account processed successfully', { accountId: account.id });
    } catch (error) {
      const errorMsg = `Failed to process account ${accountId}: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  private async processCampaigns(accountId: string, stats: ETLStats): Promise<string[]> {
    try {
      logger.info('Processing campaigns', { accountId });

      const campaignsData = await this.metaClient.getCampaigns(accountId);
      const campaigns: Database['public']['Tables']['campaigns']['Insert'][] = [];
      const campaignIds: string[] = [];

      for (const campaign of campaignsData.data || []) {
        try {
          const campaignRecord: Database['public']['Tables']['campaigns']['Insert'] = {
            id: campaign.id,
            account_id: accountId.replace('act_', ''), // Remove act_ prefix to match account table
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status?.toUpperCase(),
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : undefined,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : undefined,
            start_time: campaign.start_time || null,
            stop_time: campaign.stop_time || null,
            created_time: campaign.created_time,
            updated_time: campaign.updated_time,
          };

          campaigns.push(campaignRecord);
          campaignIds.push(campaign.id);
        } catch (error) {
          stats.errors.push(`Failed to process campaign ${campaign.id}: ${(error as Error).message}`);
        }
      }

      if (campaigns.length > 0) {
        await this.dataService.upsertCampaigns(campaigns);
        stats.campaignsProcessed = campaigns.length;
      }

      logger.info('Campaigns processed successfully', { 
        accountId, 
        count: campaigns.length 
      });

      return campaignIds;
    } catch (error) {
      const errorMsg = `Failed to process campaigns for account ${accountId}: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  private async processAdSets(campaignIds: string[], stats: ETLStats): Promise<string[]> {
    try {
      logger.info('Processing ad sets', { campaignCount: campaignIds.length });

      const allAdSets: Database['public']['Tables']['ad_sets']['Insert'][] = [];
      const adSetIds: string[] = [];

      for (const campaignId of campaignIds) {
        try {
          const adSetsData = await this.metaClient.getAdSets(campaignId);
          
          for (const adSet of adSetsData.data || []) {
            try {
              const adSetRecord: Database['public']['Tables']['ad_sets']['Insert'] = {
                id: adSet.id,
                campaign_id: campaignId,
                account_id: (adSet.account_id || env.meta.accountId).replace('act_', ''), // Remove act_ prefix
                name: adSet.name,
                status: adSet.status?.toUpperCase(),
                daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : undefined,
                lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : undefined,
                bid_amount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : undefined,
                optimization_goal: adSet.optimization_goal || null,
                billing_event: adSet.billing_event || null,
                start_time: adSet.start_time || null,
                end_time: adSet.end_time || null,
                created_time: adSet.created_time,
                updated_time: adSet.updated_time,
              };

              allAdSets.push(adSetRecord);
              adSetIds.push(adSet.id);
            } catch (error) {
              stats.errors.push(`Failed to process ad set ${adSet.id}: ${(error as Error).message}`);
            }
          }
        } catch (error) {
          stats.errors.push(`Failed to get ad sets for campaign ${campaignId}: ${(error as Error).message}`);
        }
      }

      if (allAdSets.length > 0) {
        await this.dataService.upsertAdSets(allAdSets);
        stats.adSetsProcessed = allAdSets.length;
      }

      logger.info('Ad sets processed successfully', { count: allAdSets.length });
      return adSetIds;
    } catch (error) {
      const errorMsg = `Failed to process ad sets: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  private async processAds(adSetIds: string[], stats: ETLStats): Promise<string[]> {
    try {
      logger.info('Processing ads', { adSetCount: adSetIds.length });

      const allAds: Database['public']['Tables']['ads']['Insert'][] = [];
      const adIds: string[] = [];

      for (const adSetId of adSetIds) {
        try {
          const adsData = await this.metaClient.getAds(adSetId);
          
          for (const ad of adsData.data || []) {
            try {
              const adRecord: Database['public']['Tables']['ads']['Insert'] = {
                id: ad.id,
                ad_set_id: adSetId,
                campaign_id: ad.campaign_id,
                account_id: (ad.account_id || env.meta.accountId).replace('act_', ''), // Remove act_ prefix
                name: ad.name,
                status: ad.status?.toUpperCase(),
                creative_id: ad.creative?.id || null,
                created_time: ad.created_time,
                updated_time: ad.updated_time,
              };

              allAds.push(adRecord);
              adIds.push(ad.id);
            } catch (error) {
              stats.errors.push(`Failed to process ad ${ad.id}: ${(error as Error).message}`);
            }
          }
        } catch (error) {
          stats.errors.push(`Failed to get ads for ad set ${adSetId}: ${(error as Error).message}`);
        }
      }

      if (allAds.length > 0) {
        await this.dataService.upsertAds(allAds);
        stats.adsProcessed = allAds.length;
      }

      logger.info('Ads processed successfully', { count: allAds.length });
      return adIds;
    } catch (error) {
      const errorMsg = `Failed to process ads: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  private async processInsights(
    accountId: string,
    dateStart: string,
    dateEnd: string,
    stats: ETLStats
  ): Promise<void> {
    try {
      logger.info('Processing insights', { accountId, dateStart, dateEnd });

      // Get all insights for the account and date range
      const insights = await this.metaClient.getAllInsights(accountId, {
        dateStart,
        dateEnd,
        level: 'ad',
      });

      if (insights.length === 0) {
        logger.info('No insights found for the specified date range');
        return;
      }

      // Transform Meta insights to our database format
      const transformedInsights = DataTransformer.transformBatchInsights(insights);
      const validInsights = DataTransformer.filterValidInsights(transformedInsights);

      // Convert to database insert format
      const insightRecords: Database['public']['Tables']['daily_ad_insights']['Insert'][] = 
        validInsights.map(insight => ({
          date_start: insight.date_start,
          account_id: insight.account_id,
          campaign_id: insight.campaign_id,
          ad_set_id: insight.ad_set_id,
          ad_id: insight.ad_id,
          impressions: insight.impressions,
          clicks: insight.clicks,
          spend: insight.spend,
          reach: insight.reach,
          frequency: insight.frequency,
          // Separate conversion types
          purchases: insight.purchases,
          leads: insight.leads,
          registrations: insight.registrations,
          add_to_carts: insight.add_to_carts,
          // Conversion values by type
          purchase_values: insight.purchase_values,
          lead_values: insight.lead_values,
          registration_values: insight.registration_values,
          // Calculated metrics (now stored as regular columns)
          ctr: insight.ctr,
          cpc: insight.cpc,
          cpm: insight.cpm,
          roas: insight.roas,
          // Legacy fields for backward compatibility
          conversions: insight.conversions,
          conversion_values: insight.conversion_values,
          cost_per_conversion: insight.cost_per_conversion,
          link_clicks: insight.link_clicks,
          video_views: insight.video_views,
          video_thruplay_watched_actions: insight.video_thruplay_watched_actions,
          video_15_sec_watched_actions: insight.video_15_sec_watched_actions,
          video_30_sec_watched_actions: insight.video_30_sec_watched_actions,
          video_p25_watched_actions: insight.video_p25_watched_actions,
          video_p50_watched_actions: insight.video_p50_watched_actions,
          video_p75_watched_actions: insight.video_p75_watched_actions,
          video_p95_watched_actions: insight.video_p95_watched_actions,
          video_p100_watched_actions: insight.video_p100_watched_actions,
          video_avg_time_watched_actions: insight.video_avg_time_watched_actions,
        }));

      // Batch insert insights
      if (insightRecords.length > 0) {
        await this.dataService.upsertInsights(insightRecords);
        stats.insightsProcessed = insightRecords.length;
      }

      logger.info('Insights processed successfully', { 
        rawCount: insights.length,
        transformedCount: transformedInsights.length,
        validCount: validInsights.length,
        insertedCount: insightRecords.length,
      });
    } catch (error) {
      const errorMsg = `Failed to process insights: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
      throw error;
    }
  }

  async runDailyETL(date?: string): Promise<ETLStats> {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Yesterday
    
    logger.info('Starting daily ETL', { targetDate });
    return this.runFullETL(targetDate, targetDate);
  }

  async runDateRangeETL(dateStart: string, dateEnd: string): Promise<ETLStats> {
    logger.info('Starting date range ETL', { dateStart, dateEnd });
    return this.runFullETL(dateStart, dateEnd);
  }
}