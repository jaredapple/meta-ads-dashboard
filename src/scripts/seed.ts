#!/usr/bin/env node

import { DataService } from '../services/data-service';
import { testConnection } from '../database/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Database } from '../database/types';

interface SeedStats {
  accountsCreated: number;
  campaignsCreated: number;
  adSetsCreated: number;
  adsCreated: number;
  insightsCreated: number;
}

class SeedService {
  private dataService: DataService;

  constructor() {
    this.dataService = new DataService();
  }

  async seedDatabase(): Promise<SeedStats> {
    const stats: SeedStats = {
      accountsCreated: 0,
      campaignsCreated: 0,
      adSetsCreated: 0,
      adsCreated: 0,
      insightsCreated: 0,
    };

    try {
      logger.info('Starting database seeding...');

      // Create test account
      const account = await this.createTestAccount();
      stats.accountsCreated = 1;

      // Create test campaigns
      const campaigns = await this.createTestCampaigns(account.id);
      stats.campaignsCreated = campaigns.length;

      // Create test ad sets
      const adSets = await this.createTestAdSets(campaigns);
      stats.adSetsCreated = adSets.length;

      // Create test ads
      const ads = await this.createTestAds(adSets);
      stats.adsCreated = ads.length;

      // Create test insights (last 30 days)
      const insights = await this.createTestInsights(ads, account.id);
      stats.insightsCreated = insights.length;

      logger.info('Database seeding completed successfully', stats);
      return stats;

    } catch (error) {
      logger.error('Database seeding failed', error as Error);
      throw error;
    }
  }

  private async createTestAccount(): Promise<Database['public']['Tables']['accounts']['Insert']> {
    const account: Database['public']['Tables']['accounts']['Insert'] = {
      id: '123456789',
      name: 'Test Ad Account',
      currency: 'USD',
      timezone: 'America/New_York',
      business_id: '987654321',
    };

    await this.dataService.upsertAccount(account);
    logger.info('Created test account', { accountId: account.id });

    return account;
  }

  private async createTestCampaigns(accountId: string): Promise<Database['public']['Tables']['campaigns']['Insert'][]> {
    const campaigns: Database['public']['Tables']['campaigns']['Insert'][] = [
      {
        id: 'campaign_001',
        account_id: accountId,
        name: 'Holiday Sale Campaign',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        daily_budget: 100.00,
        lifetime_budget: undefined,
        start_time: '2025-01-01T00:00:00Z',
        stop_time: undefined,
        created_time: '2025-01-01T00:00:00Z',
        updated_time: '2025-01-01T00:00:00Z',
      },
      {
        id: 'campaign_002',
        account_id: accountId,
        name: 'Brand Awareness Campaign',
        objective: 'OUTCOME_AWARENESS',
        status: 'ACTIVE',
        daily_budget: 75.00,
        lifetime_budget: undefined,
        start_time: '2025-01-01T00:00:00Z',
        stop_time: undefined,
        created_time: '2025-01-01T00:00:00Z',
        updated_time: '2025-01-01T00:00:00Z',
      },
      {
        id: 'campaign_003',
        account_id: accountId,
        name: 'Lead Generation Campaign',
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        daily_budget: 50.00,
        lifetime_budget: undefined,
        start_time: '2025-01-01T00:00:00Z',
        stop_time: undefined,
        created_time: '2025-01-01T00:00:00Z',
        updated_time: '2025-01-01T00:00:00Z',
      },
    ];

    await this.dataService.upsertCampaigns(campaigns);
    logger.info('Created test campaigns', { count: campaigns.length });

    return campaigns;
  }

  private async createTestAdSets(campaigns: Database['public']['Tables']['campaigns']['Insert'][]): Promise<Database['public']['Tables']['ad_sets']['Insert'][]> {
    const adSets: Database['public']['Tables']['ad_sets']['Insert'][] = [];

    // Create 2 ad sets per campaign
    for (const campaign of campaigns) {
      for (let i = 1; i <= 2; i++) {
        adSets.push({
          id: `${campaign.id}_adset_${i.toString().padStart(2, '0')}`,
          campaign_id: campaign.id,
          account_id: campaign.account_id,
          name: `${campaign.name} - Ad Set ${i}`,
          status: campaign.status,
          daily_budget: (campaign.daily_budget || 0) / 2, // Split budget
          lifetime_budget: undefined,
          bid_amount: 2.50 + (i * 0.5),
          optimization_goal: 'CONVERSIONS',
          billing_event: 'IMPRESSIONS',
          start_time: campaign.start_time,
          end_time: campaign.stop_time,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time,
        });
      }
    }

    await this.dataService.upsertAdSets(adSets);
    logger.info('Created test ad sets', { count: adSets.length });

    return adSets;
  }

  private async createTestAds(adSets: Database['public']['Tables']['ad_sets']['Insert'][]): Promise<Database['public']['Tables']['ads']['Insert'][]> {
    const ads: Database['public']['Tables']['ads']['Insert'][] = [];

    // Create 3 ads per ad set
    for (const adSet of adSets) {
      for (let i = 1; i <= 3; i++) {
        ads.push({
          id: `${adSet.id}_ad_${i.toString().padStart(2, '0')}`,
          ad_set_id: adSet.id,
          campaign_id: adSet.campaign_id,
          account_id: adSet.account_id,
          name: `${adSet.name} - Ad ${i}`,
          status: adSet.status,
          creative_id: `creative_${Date.now()}_${i}`,
          created_time: adSet.created_time,
          updated_time: adSet.updated_time,
        });
      }
    }

    await this.dataService.upsertAds(ads);
    logger.info('Created test ads', { count: ads.length });

    return ads;
  }

  private async createTestInsights(
    ads: Database['public']['Tables']['ads']['Insert'][],
    accountId: string
  ): Promise<Database['public']['Tables']['daily_ad_insights']['Insert'][]> {
    const insights: Database['public']['Tables']['daily_ad_insights']['Insert'][] = [];
    
    // Generate insights for the last 30 days
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0); // Set to midnight
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() - dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      for (const ad of ads) {
        // Generate realistic but varied metrics
        const baseImpressions = 1000 + Math.floor(Math.random() * 5000);
        const baseClicks = Math.floor(baseImpressions * (0.01 + Math.random() * 0.03)); // 1-4% CTR
        const baseSpend = Math.round((baseClicks * (1.5 + Math.random() * 2)) * 100) / 100; // $1.50-$3.50 CPC
        const baseConversions = Math.floor(baseClicks * (0.02 + Math.random() * 0.08)); // 2-10% conversion rate
        const baseConversionValue = baseConversions * (25 + Math.random() * 75); // $25-$100 per conversion

        // Add some variability based on campaign objective
        let impressionMultiplier = 1;
        let conversionMultiplier = 1;
        
        if (ad.campaign_id.includes('awareness')) {
          impressionMultiplier = 1.5; // More impressions for awareness
          conversionMultiplier = 0.3; // Fewer conversions
        } else if (ad.campaign_id.includes('sales')) {
          conversionMultiplier = 1.5; // More conversions for sales
        }

        // Add weekend effect (lower performance on weekends)
        const dayOfWeek = currentDate.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;

        const finalImpressions = Math.floor(baseImpressions * impressionMultiplier * weekendMultiplier);
        const finalClicks = Math.floor(baseClicks * weekendMultiplier);
        const finalSpend = Math.round(baseSpend * weekendMultiplier * 100) / 100;
        const finalConversions = Math.floor(baseConversions * conversionMultiplier * weekendMultiplier);
        const finalConversionValue = Math.round(baseConversionValue * conversionMultiplier * weekendMultiplier * 100) / 100;

        insights.push({
          date_start: dateString,
          account_id: accountId,
          campaign_id: ad.campaign_id,
          ad_set_id: ad.ad_set_id,
          ad_id: ad.id,
          impressions: finalImpressions,
          clicks: finalClicks,
          spend: finalSpend,
          reach: Math.floor(finalImpressions * 0.8), // Assume 80% reach rate
          frequency: Math.round((finalImpressions / Math.max(1, Math.floor(finalImpressions * 0.8))) * 100) / 100,
          conversions: finalConversions > 0 ? finalConversions : undefined,
          conversion_values: finalConversionValue > 0 ? finalConversionValue : undefined,
          cost_per_conversion: finalConversions > 0 ? Math.round((finalSpend / finalConversions) * 100) / 100 : undefined,
          link_clicks: Math.floor(finalClicks * (0.8 + Math.random() * 0.2)),
          video_views: finalImpressions > 500 ? Math.floor(finalImpressions * 0.1) : undefined,
          video_p25_watched_actions: finalImpressions > 500 ? Math.floor(finalImpressions * 0.08) : undefined,
          video_p50_watched_actions: finalImpressions > 500 ? Math.floor(finalImpressions * 0.05) : undefined,
          video_p75_watched_actions: finalImpressions > 500 ? Math.floor(finalImpressions * 0.03) : undefined,
          video_p100_watched_actions: finalImpressions > 500 ? Math.floor(finalImpressions * 0.02) : undefined,
        });
      }
    }

    await this.dataService.upsertInsights(insights);
    logger.info('Created test insights', { 
      count: insights.length,
      dateRange: `${insights[insights.length - 1]?.date_start} to ${insights[0]?.date_start}`,
    });

    return insights;
  }

  async clearDatabase(): Promise<void> {
    try {
      logger.info('Clearing existing seed data...');

      const client = this.dataService['client']; // Access private client
      
      // Delete in reverse order of foreign key dependencies
      await client.from('daily_ad_insights').delete().neq('account_id', 'non-existent');
      await client.from('ads').delete().neq('account_id', 'non-existent');
      await client.from('ad_sets').delete().neq('account_id', 'non-existent');
      await client.from('campaigns').delete().neq('account_id', 'non-existent');
      await client.from('accounts').delete().neq('id', 'non-existent');

      logger.info('Database cleared successfully');
    } catch (error) {
      logger.error('Failed to clear database', error as Error);
      throw error;
    }
  }
}

async function main(): Promise<void> {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('Database connection failed, exiting seed script');
      process.exit(1);
    }

    const seedService = new SeedService();
    const args = process.argv.slice(2);

    if (args.includes('--clear') || args.includes('-c')) {
      await seedService.clearDatabase();
      logger.info('Database cleared. Use "npm run seed" to populate with test data.');
    } else {
      // Clear existing data first
      await seedService.clearDatabase();
      
      // Seed with test data
      const stats = await seedService.seedDatabase();
      
      logger.info('Seed script completed successfully', stats);
      logger.info('You can now test the MCP server with the generated data');
      logger.info('Example queries:');
      logger.info('- get_spend with date_range: "last_7d"');
      logger.info('- get_roas with date_range: "last_30d"'); 
      logger.info('- best_ad with metric: "spend" and date_range: "last_7d"');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Seed script failed', error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}