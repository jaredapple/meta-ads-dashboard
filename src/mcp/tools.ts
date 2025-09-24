import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DataService } from '../services/data-service';
import { DateParser, DateParserError } from '../utils/date-parser';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class MCPTools {
  private dataService: DataService;

  constructor() {
    this.dataService = new DataService();
  }

  // Tool definitions
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_spend',
        description: 'Get advertising spend data for a specified date range. Supports preset ranges like "last_7d", "yesterday", or custom ranges like "2025-01-01,2025-01-31".',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            ad_set_id: {
              type: 'string',
              description: 'Optional: Filter by specific ad set ID',
            },
          },
          required: ['date_range'],
        },
      },
      {
        name: 'get_roas',
        description: 'Get Return on Ad Spend (ROAS) data for a specified date range. Only includes ads with conversion data.',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            ad_set_id: {
              type: 'string',
              description: 'Optional: Filter by specific ad set ID',
            },
          },
          required: ['date_range'],
        },
      },
      {
        name: 'best_ad',
        description: 'Find the best performing ads based on a specific metric (spend, roas, conversions, ctr, cpc).',
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              enum: ['spend', 'roas', 'conversions', 'ctr', 'cpc'],
              description: 'Metric to rank ads by',
            },
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            limit: {
              type: 'number',
              description: 'Number of top ads to return (default: 10, max: 50)',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['metric', 'date_range'],
        },
      },
      {
        name: 'campaign_performance',
        description: 'Get comprehensive campaign performance analysis including budget efficiency, active ads count, and detailed metrics for all campaigns.',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            limit: {
              type: 'number',
              description: 'Number of campaigns to return (default: 50, max: 100)',
              minimum: 1,
              maximum: 100,
            },
          },
          required: ['date_range'],
        },
      },
      {
        name: 'audience_insights',
        description: 'Get audience demographic insights showing performance breakdown by age, gender, and location. Analyze how different audience segments perform.',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            breakdown_by: {
              type: 'string',
              enum: ['age', 'gender', 'location', 'age_gender'],
              description: 'How to break down the audience data (default: age_gender)',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            ad_set_id: {
              type: 'string',
              description: 'Optional: Filter by specific ad set ID',
            },
          },
          required: ['date_range'],
        },
      },
      {
        name: 'trend_analysis',
        description: 'Compare performance between two time periods to identify trends and changes. Analyze period-over-period performance changes.',
        inputSchema: {
          type: 'object',
          properties: {
            current_period: {
              type: 'string',
              description: 'Current period date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-07")',
            },
            comparison_period: {
              type: 'string',
              description: 'Comparison period date range (e.g., "2024-12-25,2024-12-31" for previous week)',
            },
            metric: {
              type: 'string',
              enum: ['spend', 'impressions', 'clicks', 'conversions', 'roas', 'ctr', 'cpc'],
              description: 'Primary metric to analyze trends for (default: spend)',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            ad_set_id: {
              type: 'string',
              description: 'Optional: Filter by specific ad set ID',
            },
          },
          required: ['current_period', 'comparison_period'],
        },
      },
      {
        name: 'analyze_video_ads',
        description: 'Analyze video ad performance focusing on hook strength (thumbstop rate) and retention metrics. Provides recommendations for improving video ad performance.',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              description: 'Date range (e.g., "last_7d", "yesterday", "2025-01-01,2025-01-31")',
            },
            min_impressions: {
              type: 'number',
              description: 'Minimum impressions threshold for analysis (default: 1000)',
              minimum: 100,
            },
            metric_focus: {
              type: 'string',
              enum: ['hook', 'retention', 'completion', 'all'],
              description: 'Which video metric to focus on (default: all)',
            },
            account_id: {
              type: 'string',
              description: 'Optional: Filter by specific account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: Filter by specific campaign ID',
            },
            include_recommendations: {
              type: 'boolean',
              description: 'Include AI-powered recommendations (default: true)',
            },
          },
          required: ['date_range'],
        },
      },
    ];
  }

  // Tool implementations
  async executeGetSpend(args: any): Promise<any> {
    try {
      const { date_range, account_id, campaign_id, ad_set_id } = args;
      
      logger.info('Executing get_spend tool', { 
        dateRange: date_range, 
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get spend data from database
      const spendData = await this.dataService.getSpendData({
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      // Aggregate data by date and calculate totals
      const dailySpend = spendData.reduce((acc, row) => {
        if (!acc[row.date_start]) {
          acc[row.date_start] = {
            date: row.date_start,
            spend: 0,
            impressions: 0,
            clicks: 0,
            link_clicks: 0,
          };
        }
        acc[row.date_start].spend += parseFloat(row.spend.toString());
        acc[row.date_start].impressions += parseInt(row.impressions.toString());
        acc[row.date_start].clicks += parseInt(row.clicks.toString());
        acc[row.date_start].link_clicks += parseInt(row.link_clicks?.toString() || '0');
        return acc;
      }, {} as Record<string, any>);

      const dailyData = Object.values(dailySpend).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate totals
      const totalSpend = dailyData.reduce((sum, day) => sum + day.spend, 0);
      const totalImpressions = dailyData.reduce((sum, day) => sum + day.impressions, 0);
      const totalClicks = dailyData.reduce((sum, day) => sum + day.clicks, 0);
      const totalLinkClicks = dailyData.reduce((sum, day) => sum + day.link_clicks, 0);

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        summary: {
          total_spend: Math.round(totalSpend * 100) / 100,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          total_link_clicks: totalLinkClicks,
          average_cpc: totalLinkClicks > 0 ? Math.round((totalSpend / totalLinkClicks) * 100) / 100 : 0,
          average_ctr: totalImpressions > 0 ? Math.round((totalLinkClicks / totalImpressions * 100) * 100) / 100 : 0,
        },
        daily_breakdown: dailyData.map(day => ({
          ...day,
          spend: Math.round(day.spend * 100) / 100,
        })),
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          ad_set_id: ad_set_id || null,
        },
      };

      logger.info('get_spend tool completed successfully', { 
        totalSpend: result.summary.total_spend,
        recordCount: spendData.length,
      });

      return result;
    } catch (error) {
      logger.error('get_spend tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  async executeGetRoas(args: any): Promise<any> {
    try {
      const { date_range, account_id, campaign_id, ad_set_id } = args;
      
      logger.info('Executing get_roas tool', { 
        dateRange: date_range, 
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get ROAS data from database
      const roasData = await this.dataService.getRoasData({
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      if (roasData.length === 0) {
        return {
          date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
          date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
          message: 'No conversion data found for the specified date range and filters',
          summary: {
            total_spend: 0,
            total_conversion_value: 0,
            average_roas: 0,
            ads_with_conversions: 0,
          },
          daily_breakdown: [],
        };
      }

      // Aggregate data by date
      const dailyRoas = roasData.reduce((acc, row) => {
        if (!acc[row.date_start]) {
          acc[row.date_start] = {
            date: row.date_start,
            spend: 0,
            conversion_values: 0,
            count: 0,
          };
        }
        acc[row.date_start].spend += parseFloat(row.spend.toString());
        acc[row.date_start].conversion_values += parseFloat(row.conversion_values.toString());
        acc[row.date_start].count += 1;
        return acc;
      }, {} as Record<string, any>);

      const dailyData = Object.values(dailyRoas).map((day: any) => ({
        date: day.date,
        spend: Math.round(day.spend * 100) / 100,
        conversion_values: Math.round(day.conversion_values * 100) / 100,
        roas: day.spend > 0 ? Math.round((day.conversion_values / day.spend) * 100) / 100 : 0,
        ads_count: day.count,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate totals
      const totalSpend = dailyData.reduce((sum, day) => sum + day.spend, 0);
      const totalConversionValue = dailyData.reduce((sum, day) => sum + day.conversion_values, 0);
      const overallRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        summary: {
          total_spend: Math.round(totalSpend * 100) / 100,
          total_conversion_value: Math.round(totalConversionValue * 100) / 100,
          average_roas: Math.round(overallRoas * 100) / 100,
          ads_with_conversions: roasData.length,
        },
        daily_breakdown: dailyData,
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          ad_set_id: ad_set_id || null,
        },
      };

      logger.info('get_roas tool completed successfully', { 
        totalSpend: result.summary.total_spend,
        averageRoas: result.summary.average_roas,
        recordCount: roasData.length,
      });

      return result;
    } catch (error) {
      logger.error('get_roas tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  async executeBestAd(args: any): Promise<any> {
    try {
      const { metric, date_range, account_id, campaign_id, limit = 10 } = args;
      
      logger.info('Executing best_ad tool', { 
        metric, 
        dateRange: date_range, 
        accountId: account_id,
        campaignId: campaign_id,
        limit,
      });

      // Validate limit
      const validLimit = Math.min(Math.max(1, parseInt(limit)), 50);

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get best ads data from database
      const bestAds = await this.dataService.getBestAds({
        metric,
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        campaignId: campaign_id,
        limit: validLimit,
      });

      if (bestAds.length === 0) {
        return {
          date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
          date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
          metric,
          message: 'No ad data found for the specified date range and filters',
          ads: [],
        };
      }

      // Format the results
      const formattedAds = bestAds.map((ad, index) => {
        const totalSpend = parseFloat(ad.total_spend.toString());
        const totalConversions = parseFloat(ad.total_conversions?.toString() || '0');
        
        // Calculate accurate CPA based on purchases only
        const purchaseCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
        
        return {
          rank: index + 1,
          ad_id: ad.ad_id,
          ad_name: ad.ad_name,
          campaign_name: ad.campaign_name,
          metrics: {
            total_spend: Math.round(totalSpend * 100) / 100,
            total_purchases: Math.round(totalConversions * 100) / 100, // This is now purchases, not total conversions
            purchase_cpa: Math.round(purchaseCPA * 10000) / 10000, // Higher precision for CPA
            average_roas: Math.round(parseFloat(ad.avg_roas?.toString() || '0') * 10000) / 10000,
            average_ctr: Math.round(parseFloat(ad.avg_ctr?.toString() || '0') * 10000) / 10000,
            average_cpc: Math.round(parseFloat(ad.avg_cpc?.toString() || '0') * 10000) / 10000,
            // Legacy field for backward compatibility
            total_conversions: Math.round(totalConversions * 100) / 100,
          },
          primary_metric_value: Math.round(parseFloat(ad.metric_value?.toString() || '0') * 100) / 100,
        };
      });

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        metric: metric,
        metric_description: this.getMetricDescription(metric),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        ads_found: bestAds.length,
        ads: formattedAds,
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          limit: validLimit,
        },
      };

      logger.info('best_ad tool completed successfully', { 
        metric,
        adsFound: bestAds.length,
        topAdId: bestAds[0]?.ad_id,
      });

      return result;
    } catch (error) {
      logger.error('best_ad tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  async executeCampaignPerformance(args: any): Promise<any> {
    try {
      const { date_range, account_id, limit = 50 } = args;
      
      logger.info('Executing campaign_performance tool', { 
        dateRange: date_range, 
        accountId: account_id,
        limit,
      });

      // Validate limit
      const validLimit = Math.min(Math.max(1, parseInt(limit)), 100);

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get campaign performance data from database
      const campaignData = await this.dataService.getCampaignPerformance({
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        limit: validLimit,
      });

      if (campaignData.length === 0) {
        return {
          date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
          date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
          message: 'No campaign data found for the specified date range and filters',
          campaigns: [],
          summary: {
            total_campaigns: 0,
            total_spend: 0,
            total_conversions: 0,
            average_roas: 0,
            active_campaigns: 0,
          },
        };
      }

      // Calculate summary metrics
      const totalSpend = campaignData.reduce((sum, campaign) => sum + campaign.total_spend, 0);
      const totalConversions = campaignData.reduce((sum, campaign) => sum + campaign.total_conversions, 0);
      const totalConversionValue = campaignData.reduce((sum, campaign) => sum + campaign.total_conversion_value, 0);
      const averageRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;
      const activeCampaigns = campaignData.filter(c => c.campaign_status === 'ACTIVE').length;

      // Format campaign data for response
      const formattedCampaigns = campaignData.map((campaign, index) => ({
        rank: index + 1,
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        objective: campaign.campaign_objective,
        status: campaign.campaign_status,
        budget_info: {
          daily_budget: campaign.daily_budget,
          lifetime_budget: campaign.lifetime_budget,
          budget_utilization_percent: campaign.budget_utilization,
        },
        performance_metrics: {
          total_spend: campaign.total_spend,
          total_impressions: campaign.total_impressions,
          total_clicks: campaign.total_clicks,
          total_conversions: campaign.total_conversions,
          total_conversion_value: campaign.total_conversion_value,
          avg_ctr: campaign.avg_ctr,
          avg_cpc: campaign.avg_cpc,
          avg_roas: campaign.avg_roas,
        },
        active_ads: campaign.active_ads,
      }));

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        summary: {
          total_campaigns: campaignData.length,
          total_spend: Math.round(totalSpend * 100) / 100,
          total_conversions: Math.round(totalConversions * 100) / 100,
          total_conversion_value: Math.round(totalConversionValue * 100) / 100,
          average_roas: Math.round(averageRoas * 100) / 100,
          active_campaigns: activeCampaigns,
        },
        campaigns: formattedCampaigns,
        filters_applied: {
          account_id: account_id || null,
          limit: validLimit,
        },
      };

      logger.info('campaign_performance tool completed successfully', { 
        campaignsFound: campaignData.length,
        totalSpend: result.summary.total_spend,
        activeCampaigns,
      });

      return result;
    } catch (error) {
      logger.error('campaign_performance tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  async executeAudienceInsights(args: any): Promise<any> {
    try {
      const { date_range, breakdown_by = 'age_gender', account_id, campaign_id, ad_set_id } = args;
      
      logger.info('Executing audience_insights tool', { 
        dateRange: date_range, 
        breakdownBy: breakdown_by,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get audience insights data from database
      const audienceData = await this.dataService.getAudienceInsights({
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
        breakdownBy: breakdown_by,
      });

      if (audienceData.length === 0) {
        return {
          date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
          date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
          breakdown_by: breakdown_by,
          message: 'No demographic data found for the specified date range and filters. This feature requires demographic breakdown data to be available.',
          audience_segments: [],
          summary: {
            total_segments: 0,
            total_spend: 0,
            total_impressions: 0,
            total_conversions: 0,
            top_performing_segment: null,
          },
        };
      }

      // Calculate summary metrics
      const totalSpend = audienceData.reduce((sum, segment) => sum + segment.total_spend, 0);
      const totalImpressions = audienceData.reduce((sum, segment) => sum + segment.total_impressions, 0);
      const totalConversions = audienceData.reduce((sum, segment) => sum + segment.total_conversions, 0);
      const topPerformingSegment = audienceData.length > 0 ? audienceData[0] : null;

      // Format audience segments for response
      const formattedSegments = audienceData.map((segment, index) => ({
        rank: index + 1,
        segment_name: segment.dimension_value,
        segment_key: segment.dimension_key,
        performance_metrics: {
          total_spend: segment.total_spend,
          total_impressions: segment.total_impressions,
          total_clicks: segment.total_clicks,
          total_conversions: segment.total_conversions,
          total_conversion_value: segment.total_conversion_value,
          avg_ctr: segment.avg_ctr,
          avg_cpc: segment.avg_cpc,
          avg_roas: segment.avg_roas,
          reach: segment.reach,
        },
        share_of_total: {
          spend_percentage: segment.percentage_of_total_spend,
          impressions_percentage: segment.percentage_of_total_impressions,
        },
      }));

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        breakdown_by: breakdown_by,
        breakdown_description: this.getBreakdownDescription(breakdown_by),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        summary: {
          total_segments: audienceData.length,
          total_spend: Math.round(totalSpend * 100) / 100,
          total_impressions: totalImpressions,
          total_conversions: Math.round(totalConversions * 100) / 100,
          top_performing_segment: topPerformingSegment ? {
            name: topPerformingSegment.dimension_value,
            spend: topPerformingSegment.total_spend,
            spend_percentage: topPerformingSegment.percentage_of_total_spend,
          } : null,
        },
        audience_segments: formattedSegments,
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          ad_set_id: ad_set_id || null,
        },
      };

      logger.info('audience_insights tool completed successfully', { 
        segmentsFound: audienceData.length,
        totalSpend: result.summary.total_spend,
        breakdownBy: breakdown_by,
      });

      return result;
    } catch (error) {
      logger.error('audience_insights tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  async executeTrendAnalysis(args: any): Promise<any> {
    try {
      const { current_period, comparison_period, metric = 'spend', account_id, campaign_id, ad_set_id } = args;
      
      logger.info('Executing trend_analysis tool', { 
        currentPeriod: current_period,
        comparisonPeriod: comparison_period,
        metric,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
      });

      // Parse both date ranges
      const { startDate: currentStart, endDate: currentEnd } = DateParser.parseDateRange(current_period);
      const { startDate: comparisonStart, endDate: comparisonEnd } = DateParser.parseDateRange(comparison_period);
      
      DateParser.validateDateRange({ startDate: currentStart, endDate: currentEnd });
      DateParser.validateDateRange({ startDate: comparisonStart, endDate: comparisonEnd });

      // Get trend analysis data from database
      const trendData = await this.dataService.getTrendAnalysis({
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        comparisonPeriodStart: comparisonStart,
        comparisonPeriodEnd: comparisonEnd,
        accountId: account_id,
        campaignId: campaign_id,
        adSetId: ad_set_id,
        metric,
      });

      // Format the response
      const result = {
        analysis_type: 'trend_comparison',
        primary_metric: metric,
        metric_description: this.getMetricDescription(metric),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        
        current_period: {
          ...trendData.current_period,
          description: `Current period (${DateParser.getRelativeDescription({ 
            startDate: currentStart, 
            endDate: currentEnd 
          })})`,
          formatted_range: DateParser.formatDateRangeForDisplay({ 
            startDate: currentStart, 
            endDate: currentEnd 
          }),
        },
        
        comparison_period: {
          ...trendData.comparison_period,
          description: `Comparison period (${DateParser.getRelativeDescription({ 
            startDate: comparisonStart, 
            endDate: comparisonEnd 
          })})`,
          formatted_range: DateParser.formatDateRangeForDisplay({ 
            startDate: comparisonStart, 
            endDate: comparisonEnd 
          }),
        },
        
        trends: {
          ...trendData.trends,
          summary: this.generateTrendSummary(trendData.trends, metric),
        },
        
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          ad_set_id: ad_set_id || null,
        },
      };

      logger.info('trend_analysis tool completed successfully', { 
        metric,
        trendDirection: trendData.trends.trend_direction,
        primaryMetricChange: trendData.trends.primary_metric_change_percent,
      });

      return result;
    } catch (error) {
      logger.error('trend_analysis tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  private generateTrendSummary(trends: any, metric: string): string {
    const direction = trends.trend_direction;
    const changePercent = Math.abs(trends.primary_metric_change_percent);
    const metricName = this.getMetricDisplayName(metric);
    
    if (direction === 'stable') {
      return `${metricName} remained relatively stable with minimal change (${trends.primary_metric_change_percent > 0 ? '+' : ''}${trends.primary_metric_change_percent}%)`;
    }
    
    const directionText = direction === 'up' ? 'increased' : 'decreased';
    const changeText = changePercent >= 20 ? 'significantly' : changePercent >= 10 ? 'notably' : 'moderately';
    
    return `${metricName} ${directionText} ${changeText} by ${changePercent}% compared to the previous period`;
  }

  private getMetricDisplayName(metric: string): string {
    const displayNames = {
      spend: 'Advertising spend',
      impressions: 'Impressions',
      clicks: 'Clicks',
      conversions: 'Conversions',
      roas: 'Return on Ad Spend (ROAS)',
      ctr: 'Click-through rate (CTR)',
      cpc: 'Cost per click (CPC)',
    };
    return displayNames[metric as keyof typeof displayNames] || metric;
  }

  private getBreakdownDescription(breakdown: string): string {
    const descriptions = {
      age: 'Performance broken down by age ranges',
      gender: 'Performance broken down by gender demographics', 
      location: 'Performance broken down by geographic location (country and region)',
      age_gender: 'Performance broken down by age and gender combinations',
    };
    return descriptions[breakdown as keyof typeof descriptions] || breakdown;
  }

  async executeAnalyzeVideoAds(args: any): Promise<any> {
    try {
      const { 
        date_range, 
        min_impressions = 1000, 
        metric_focus = 'all',
        account_id, 
        campaign_id,
        include_recommendations = true 
      } = args;
      
      logger.info('Executing analyze_video_ads tool', { 
        dateRange: date_range, 
        minImpressions: min_impressions,
        metricFocus: metric_focus,
        accountId: account_id,
        campaignId: campaign_id,
      });

      // Parse date range
      const { startDate, endDate } = DateParser.parseDateRange(date_range);
      DateParser.validateDateRange({ startDate, endDate });

      // Get video performance data
      const videoData = await this.dataService.getVideoPerformance({
        dateStart: startDate,
        dateEnd: endDate,
        accountId: account_id,
        campaignId: campaign_id,
        minImpressions: min_impressions,
      });

      if (videoData.length === 0) {
        return {
          date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
          date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
          message: 'No video ad data found for the specified date range and filters',
          video_metrics: [],
          recommendations: [],
        };
      }

      // Calculate aggregate metrics
      const totalImpressions = videoData.reduce((sum, v) => sum + v.impressions, 0);
      const totalThumbstops = videoData.reduce((sum, v) => sum + v.video_thruplay_watched_actions, 0);
      const total15SecViews = videoData.reduce((sum, v) => sum + v.video_15_sec_watched_actions, 0);
      const totalCompletions = videoData.reduce((sum, v) => sum + v.video_p100_watched_actions, 0);
      const totalSpend = videoData.reduce((sum, v) => sum + v.spend, 0);

      const avgThumbstopRate = totalImpressions > 0 ? (totalThumbstops / totalImpressions) * 100 : 0;
      const avgHoldRate = totalImpressions > 0 ? (total15SecViews / totalImpressions) * 100 : 0;
      const avgCompletionRate = totalImpressions > 0 ? (totalCompletions / totalImpressions) * 100 : 0;

      // Filter and sort based on metric focus
      let sortedVideos = [...videoData];
      switch (metric_focus) {
        case 'hook':
          sortedVideos.sort((a, b) => b.thumbstop_rate - a.thumbstop_rate);
          break;
        case 'retention':
          sortedVideos.sort((a, b) => b.hold_rate_15s - a.hold_rate_15s);
          break;
        case 'completion':
          sortedVideos.sort((a, b) => b.completion_rate - a.completion_rate);
          break;
        default:
          sortedVideos.sort((a, b) => b.spend - a.spend);
      }

      // Generate recommendations if requested
      let recommendations = [];
      if (include_recommendations) {
        recommendations = this.generateVideoRecommendations(sortedVideos);
      }

      // Format video metrics
      const formattedVideos = sortedVideos.slice(0, 10).map((video, index) => ({
        rank: index + 1,
        ad_id: video.ad_id,
        ad_name: video.ad_name,
        campaign_name: video.campaign_name,
        metrics: {
          impressions: video.impressions,
          spend: Math.round(video.spend * 100) / 100,
          thumbstop_rate: Math.round(video.thumbstop_rate * 100) / 100,
          hold_rate_15s: Math.round(video.hold_rate_15s * 100) / 100,
          completion_rate: Math.round(video.completion_rate * 100) / 100,
          avg_watch_percentage: Math.round(video.avg_watch_percentage * 100) / 100,
          cost_per_thumbstop: Math.round(video.cost_per_thumbstop * 100) / 100,
          roas: Math.round(video.roas * 100) / 100,
        },
        performance_assessment: this.assessVideoPerformance(video),
      }));

      const result = {
        date_range: DateParser.formatDateRangeForDisplay({ startDate, endDate }),
        date_range_description: DateParser.getRelativeDescription({ startDate, endDate }),
        currency: env.app.defaultCurrency,
        timezone: env.app.defaultTimezone,
        summary: {
          total_videos_analyzed: videoData.length,
          avg_thumbstop_rate: Math.round(avgThumbstopRate * 100) / 100,
          avg_hold_rate_15s: Math.round(avgHoldRate * 100) / 100,
          avg_completion_rate: Math.round(avgCompletionRate * 100) / 100,
          total_spend: Math.round(totalSpend * 100) / 100,
          benchmarks: {
            thumbstop_good: 20.0,
            hold_rate_good: 6.0,
            completion_good: 15.0,
          },
        },
        top_videos: formattedVideos,
        recommendations: include_recommendations ? recommendations.slice(0, 5) : [],
        filters_applied: {
          account_id: account_id || null,
          campaign_id: campaign_id || null,
          min_impressions: min_impressions,
          metric_focus: metric_focus,
        },
      };

      logger.info('analyze_video_ads tool completed successfully', { 
        videosAnalyzed: videoData.length,
        recommendationsGenerated: recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error('analyze_video_ads tool failed', error as Error, args);
      
      if (error instanceof DateParserError) {
        return {
          error: 'Invalid date range',
          message: error.message,
          input: error.input,
        };
      }
      
      throw error;
    }
  }

  private generateVideoRecommendations(videos: any[]): any[] {
    const recommendations = [];
    
    for (const video of videos.slice(0, 10)) {
      const thumbstopRate = video.thumbstop_rate || 0;
      const holdRate = video.hold_rate_15s || 0;
      const completionRate = video.completion_rate || 0;
      const roas = video.roas || 0;
      const spend = video.spend || 0;

      // High performer - scale up
      if (thumbstopRate >= 20.0 && holdRate >= 6.0 && roas > 2) {
        recommendations.push({
          ad_id: video.ad_id,
          ad_name: video.ad_name,
          type: 'scale_up',
          priority: 'high',
          recommendation: `Strong performer with ${thumbstopRate.toFixed(1)}% hook rate and ${holdRate.toFixed(1)}% retention. Consider increasing budget by 30-50% and testing similar creative styles.`,
          action_items: [
            'Increase daily budget',
            'Duplicate to new audiences',
            'Create similar videos',
          ],
        });
      }
      // Poor hook performance
      else if (thumbstopRate < 15.0 && spend > 100) {
        recommendations.push({
          ad_id: video.ad_id,
          ad_name: video.ad_name,
          type: 'improve_hook',
          priority: spend > 500 ? 'high' : 'medium',
          recommendation: `Weak hook performance at ${thumbstopRate.toFixed(1)}% (benchmark: 20%). Focus on improving first 3 seconds.`,
          action_items: [
            'Test new thumbnail',
            'Add text overlay in opening',
            'Start with compelling moment',
          ],
        });
      }
      // Good hook but poor retention
      else if (thumbstopRate >= 15.0 && holdRate < 4.5) {
        recommendations.push({
          ad_id: video.ad_id,
          ad_name: video.ad_name,
          type: 'improve_retention',
          priority: 'high',
          recommendation: `Good hook (${thumbstopRate.toFixed(1)}%) but losing viewers by 15s (${holdRate.toFixed(1)}%). Content may not match hook promise.`,
          action_items: [
            'Deliver on hook promise faster',
            'Increase pacing in 3-15s range',
            'Add captions for silent viewing',
          ],
        });
      }
    }

    return recommendations;
  }

  private assessVideoPerformance(video: any): string {
    const thumbstopRate = video.thumbstop_rate || 0;
    const holdRate = video.hold_rate_15s || 0;
    const roas = video.roas || 0;

    if (thumbstopRate >= 26.0 && holdRate >= 9.0 && roas > 2) {
      return 'Excellent - Scale this video';
    } else if (thumbstopRate >= 20.0 && holdRate >= 6.0) {
      return 'Good - Optimize and monitor';
    } else if (thumbstopRate >= 15.0 || holdRate >= 4.5) {
      return 'Fair - Needs improvement';
    } else {
      return 'Poor - Consider pausing or replacing';
    }
  }

  private getMetricDescription(metric: string): string {
    const descriptions = {
      spend: 'Total advertising spend',
      roas: 'Return on Ad Spend (purchase value / spend) - purchase-specific',
      conversions: 'Total number of purchase conversions (excludes leads, registrations)',
      ctr: 'Click-through rate (clicks / impressions)',
      cpc: 'Cost per click (spend / clicks)',
    };
    return descriptions[metric as keyof typeof descriptions] || metric;
  }
}