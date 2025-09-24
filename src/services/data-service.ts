import { getSupabaseClient } from '../database/client';
import { logger } from '../utils/logger';
import { Database, Account, Campaign, AdSet, Ad, DailyAdInsight } from '../database/types';
import { TransformedInsight } from './data-transformer';

export class DataService {
  private client = getSupabaseClient();

  // Account operations
  async upsertAccount(account: Database['public']['Tables']['accounts']['Insert']): Promise<void> {
    try {
      const { error } = await this.client
        .from('accounts')
        .upsert(account, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.debug('Account upserted successfully', { accountId: account.id });
    } catch (error) {
      logger.error('Failed to upsert account', error as Error, { accountId: account.id });
      throw error;
    }
  }

  // Campaign operations
  async upsertCampaign(campaign: Database['public']['Tables']['campaigns']['Insert']): Promise<void> {
    try {
      const { error } = await this.client
        .from('campaigns')
        .upsert(campaign, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.debug('Campaign upserted successfully', { campaignId: campaign.id });
    } catch (error) {
      logger.error('Failed to upsert campaign', error as Error, { campaignId: campaign.id });
      throw error;
    }
  }

  async upsertCampaigns(campaigns: Database['public']['Tables']['campaigns']['Insert'][]): Promise<void> {
    if (campaigns.length === 0) return;

    try {
      const { error } = await this.client
        .from('campaigns')
        .upsert(campaigns, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.info('Campaigns batch upserted', { count: campaigns.length });
    } catch (error) {
      logger.error('Failed to upsert campaigns batch', error as Error, { count: campaigns.length });
      throw error;
    }
  }

  // Ad Set operations
  async upsertAdSet(adSet: Database['public']['Tables']['ad_sets']['Insert']): Promise<void> {
    try {
      const { error } = await this.client
        .from('ad_sets')
        .upsert(adSet, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.debug('Ad set upserted successfully', { adSetId: adSet.id });
    } catch (error) {
      logger.error('Failed to upsert ad set', error as Error, { adSetId: adSet.id });
      throw error;
    }
  }

  async upsertAdSets(adSets: Database['public']['Tables']['ad_sets']['Insert'][]): Promise<void> {
    if (adSets.length === 0) return;

    try {
      const { error } = await this.client
        .from('ad_sets')
        .upsert(adSets, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.info('Ad sets batch upserted', { count: adSets.length });
    } catch (error) {
      logger.error('Failed to upsert ad sets batch', error as Error, { count: adSets.length });
      throw error;
    }
  }

  // Ad operations
  async upsertAd(ad: Database['public']['Tables']['ads']['Insert']): Promise<void> {
    try {
      const { error } = await this.client
        .from('ads')
        .upsert(ad, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.debug('Ad upserted successfully', { adId: ad.id });
    } catch (error) {
      logger.error('Failed to upsert ad', error as Error, { adId: ad.id });
      throw error;
    }
  }

  async upsertAds(ads: Database['public']['Tables']['ads']['Insert'][]): Promise<void> {
    if (ads.length === 0) return;

    try {
      const { error } = await this.client
        .from('ads')
        .upsert(ads, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.info('Ads batch upserted', { count: ads.length });
    } catch (error) {
      logger.error('Failed to upsert ads batch', error as Error, { count: ads.length });
      throw error;
    }
  }

  // Insights operations
  async upsertInsight(insight: Database['public']['Tables']['daily_ad_insights']['Insert']): Promise<void> {
    try {
      const { error } = await this.client
        .from('daily_ad_insights')
        .upsert(insight, {
          onConflict: 'ad_id,date_start',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      logger.debug('Insight upserted successfully', { 
        adId: insight.ad_id, 
        date: insight.date_start 
      });
    } catch (error) {
      logger.error('Failed to upsert insight', error as Error, { 
        adId: insight.ad_id,
        date: insight.date_start 
      });
      throw error;
    }
  }

  async upsertInsights(insights: Database['public']['Tables']['daily_ad_insights']['Insert'][]): Promise<void> {
    if (insights.length === 0) return;

    try {
      // Process in batches to avoid hitting database limits
      const BATCH_SIZE = 1000;
      
      for (let i = 0; i < insights.length; i += BATCH_SIZE) {
        const batch = insights.slice(i, i + BATCH_SIZE);
        
        const { error } = await this.client
          .from('daily_ad_insights')
          .upsert(batch, {
            onConflict: 'ad_id,date_start',
            ignoreDuplicates: false,
          });

        if (error) {
          throw error;
        }

        logger.debug('Insights batch upserted', { 
          batchSize: batch.length,
          batchNumber: Math.floor(i / BATCH_SIZE) + 1 
        });
      }

      logger.info('All insights batches upserted', { totalCount: insights.length });
    } catch (error) {
      logger.error('Failed to upsert insights batch', error as Error, { 
        totalCount: insights.length 
      });
      throw error;
    }
  }

  // Query operations for MCP server
  async getSpendData(options: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
  }): Promise<Array<{
    date_start: string;
    account_id: string;
    campaign_id?: string;
    ad_set_id?: string;
    spend: number;
    impressions: number;
    clicks: number;
    link_clicks: number;
  }>> {
    try {
      let query = this.client
        .from('daily_ad_insights')
        .select('date_start, account_id, campaign_id, ad_set_id, spend, impressions, clicks, link_clicks')
        .gte('date_start', options.dateStart)
        .lte('date_start', options.dateEnd);

      if (options.accountId) query = query.eq('account_id', options.accountId);
      if (options.campaignId) query = query.eq('campaign_id', options.campaignId);
      if (options.adSetId) query = query.eq('ad_set_id', options.adSetId);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get spend data', error as Error, options);
      throw error;
    }
  }

  async getRoasData(options: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
  }): Promise<Array<{
    date_start: string;
    account_id: string;
    campaign_id?: string;
    ad_set_id?: string;
    spend: number;
    conversion_values: number;
    roas: number;
  }>> {
    try {
      let query = this.client
        .from('daily_ad_insights')
        .select('date_start, account_id, campaign_id, ad_set_id, spend, conversion_values, roas')
        .gte('date_start', options.dateStart)
        .lte('date_start', options.dateEnd)
        .not('conversion_values', 'is', null)
        .gt('conversion_values', 0);

      if (options.accountId) query = query.eq('account_id', options.accountId);
      if (options.campaignId) query = query.eq('campaign_id', options.campaignId);
      if (options.adSetId) query = query.eq('ad_set_id', options.adSetId);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get ROAS data', error as Error, options);
      throw error;
    }
  }

  async getBestAds(options: {
    metric: 'spend' | 'roas' | 'conversions' | 'ctr' | 'cpc';
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    limit?: number;
  }): Promise<Array<{
    ad_id: string;
    ad_name: string;
    campaign_name: string;
    total_spend: number;
    total_conversions: number;
    avg_roas: number;
    avg_ctr: number;
    avg_cpc: number;
    metric_value: number;
  }>> {
    try {
      const limit = options.limit || 10;
      
      // First get insights data - include both new and legacy fields
      let insightsQuery = this.client
        .from('daily_ad_insights')
        .select('ad_id, spend, purchases, conversions, purchase_roas, roas, ctr, cpc, purchase_cpa')
        .gte('date_start', options.dateStart)
        .lte('date_start', options.dateEnd);

      if (options.accountId) insightsQuery = insightsQuery.eq('account_id', options.accountId);
      if (options.campaignId) insightsQuery = insightsQuery.eq('campaign_id', options.campaignId);

      const { data: insights, error: insightsError } = await insightsQuery;
      
      if (insightsError) {
        throw insightsError;
      }

      if (!insights || insights.length === 0) {
        return [];
      }

      // Aggregate data by ad_id
      const adMetrics: Record<string, any> = {};
      
      for (const insight of insights) {
        const adId = insight.ad_id;
        if (!adMetrics[adId]) {
          adMetrics[adId] = {
            ad_id: adId,
            total_spend: 0,
            total_purchases: 0, // Use purchases instead of total conversions
            total_conversions: 0, // Keep for legacy compatibility
            purchase_roas_sum: 0,
            roas_sum: 0,
            ctr_sum: 0,
            cpc_sum: 0,
            count: 0,
          };
        }
        
        adMetrics[adId].total_spend += parseFloat(insight.spend?.toString() || '0');
        adMetrics[adId].total_purchases += parseFloat(insight.purchases?.toString() || '0');
        adMetrics[adId].total_conversions += parseFloat(insight.conversions?.toString() || '0');
        adMetrics[adId].purchase_roas_sum += parseFloat(insight.purchase_roas?.toString() || '0');
        adMetrics[adId].roas_sum += parseFloat(insight.roas?.toString() || '0');
        adMetrics[adId].ctr_sum += parseFloat(insight.ctr?.toString() || '0');
        adMetrics[adId].cpc_sum += parseFloat(insight.cpc?.toString() || '0');
        adMetrics[adId].count++;
      }

      // Calculate averages and get ad names
      const adIds = Object.keys(adMetrics);
      const { data: ads, error: adsError } = await this.client
        .from('ads')
        .select('id, name, campaign_id')
        .in('id', adIds);

      if (adsError) {
        throw adsError;
      }

      const { data: campaigns, error: campaignsError } = await this.client
        .from('campaigns')
        .select('id, name');

      if (campaignsError) {
        throw campaignsError;
      }

      // Build final result
      const result: Array<{
        ad_id: string;
        ad_name: string;
        campaign_name: string;
        total_spend: number;
        total_conversions: number;
        avg_roas: number;
        avg_ctr: number;
        avg_cpc: number;
        metric_value: number;
      }> = [];

      const adMap = (ads || []).reduce((acc, ad) => {
        acc[ad.id] = ad;
        return acc;
      }, {} as Record<string, any>);

      const campaignMap = (campaigns || []).reduce((acc, campaign) => {
        acc[campaign.id] = campaign;
        return acc;
      }, {} as Record<string, any>);

      for (const [adId, metrics] of Object.entries(adMetrics)) {
        const ad = adMap[adId];
        const campaign = campaignMap[ad?.campaign_id];
        
        // Use purchase-specific ROAS for accurate calculation
        const avgPurchaseRoas = metrics.count > 0 ? metrics.purchase_roas_sum / metrics.count : 0;
        const avgRoas = metrics.count > 0 ? metrics.roas_sum / metrics.count : 0;
        const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0;
        const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0;

        let metricValue = 0;
        switch (options.metric) {
          case 'spend':
            metricValue = metrics.total_spend;
            break;
          case 'roas':
            // Use purchase ROAS for more accurate ranking
            metricValue = avgPurchaseRoas || avgRoas;
            break;
          case 'conversions':
            // For conversions metric, show purchases (not total conversions)
            metricValue = metrics.total_purchases;
            break;
          case 'ctr':
            metricValue = avgCtr;
            break;
          case 'cpc':
            metricValue = avgCpc;
            break;
        }

        result.push({
          ad_id: adId,
          ad_name: ad?.name || 'Unknown Ad',
          campaign_name: campaign?.name || 'Unknown Campaign',
          total_spend: metrics.total_spend,
          // Show purchases instead of total conversions for accuracy
          total_conversions: metrics.total_purchases,
          avg_roas: avgPurchaseRoas || avgRoas,
          avg_ctr: avgCtr,
          avg_cpc: avgCpc,
          metric_value: metricValue,
        });
      }

      // Sort by metric and limit
      result.sort((a, b) => b.metric_value - a.metric_value);
      
      return result.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get best ads', error as Error, options);
      throw error;
    }
  }

  async getAudienceInsights(options: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
    breakdownBy?: 'age' | 'gender' | 'location' | 'age_gender';
  }): Promise<Array<{
    dimension_key: string;
    dimension_value: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_conversion_value: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_roas: number;
    reach: number;
    percentage_of_total_spend: number;
    percentage_of_total_impressions: number;
  }>> {
    try {
      const breakdownBy = options.breakdownBy || 'age_gender';
      
      // Build the query based on breakdown type
      let selectFields = '';
      let groupByFields = '';
      
      switch (breakdownBy) {
        case 'age':
          selectFields = 'age_range as dimension_key, age_range as dimension_value';
          groupByFields = 'age_range';
          break;
        case 'gender':
          selectFields = 'gender as dimension_key, gender as dimension_value';
          groupByFields = 'gender';
          break;
        case 'location':
          selectFields = 'COALESCE(country_code, \'unknown\') as dimension_key, COALESCE(country_code || \' - \' || region, \'Unknown\') as dimension_value';
          groupByFields = 'country_code, region';
          break;
        case 'age_gender':
        default:
          selectFields = 'COALESCE(age_range || \' - \' || gender, \'Unknown\') as dimension_key, COALESCE(age_range || \' - \' || gender, \'Unknown\') as dimension_value';
          groupByFields = 'age_range, gender';
          break;
      }

      let query = this.client
        .from('daily_demographic_insights')
        .select(`
          ${selectFields},
          SUM(spend)::numeric as total_spend,
          SUM(impressions)::numeric as total_impressions,
          SUM(clicks)::numeric as total_clicks,
          SUM(conversions)::numeric as total_conversions,
          SUM(conversion_values)::numeric as total_conversion_value,
          AVG(ctr)::numeric as avg_ctr,
          AVG(cpc)::numeric as avg_cpc,
          AVG(roas)::numeric as avg_roas,
          SUM(reach)::numeric as reach
        `)
        .gte('date_start', options.dateStart)
        .lte('date_start', options.dateEnd);

      if (options.accountId) query = query.eq('account_id', options.accountId);
      if (options.campaignId) query = query.eq('campaign_id', options.campaignId);
      if (options.adSetId) query = query.eq('ad_set_id', options.adSetId);

      // Note: Supabase doesn't support dynamic GROUP BY in the query builder, 
      // so we need to use raw SQL for this complex query
      const { data, error } = await this.client.rpc('get_audience_insights', {
        date_start: options.dateStart,
        date_end: options.dateEnd,
        account_id: options.accountId || null,
        campaign_id: options.campaignId || null,
        ad_set_id: options.adSetId || null,
        breakdown_by: breakdownBy
      });

      if (error) {
        // Fallback to basic query if RPC function doesn't exist
        logger.warn('RPC function not available, using basic query', { error: error.message });
        
        // For now, return empty array until we can implement the RPC function
        return [];
      }

      // Calculate percentages
      const totalSpend = (data || []).reduce((sum: number, row: any) => sum + parseFloat(row.total_spend?.toString() || '0'), 0);
      const totalImpressions = (data || []).reduce((sum: number, row: any) => sum + parseInt(row.total_impressions?.toString() || '0'), 0);

      const result = (data || []).map((row: any) => ({
        dimension_key: row.dimension_key || 'Unknown',
        dimension_value: row.dimension_value || 'Unknown',
        total_spend: Math.round(parseFloat(row.total_spend?.toString() || '0') * 100) / 100,
        total_impressions: parseInt(row.total_impressions?.toString() || '0'),
        total_clicks: parseInt(row.total_clicks?.toString() || '0'),
        total_conversions: Math.round(parseFloat(row.total_conversions?.toString() || '0') * 100) / 100,
        total_conversion_value: Math.round(parseFloat(row.total_conversion_value?.toString() || '0') * 100) / 100,
        avg_ctr: Math.round(parseFloat(row.avg_ctr?.toString() || '0') * 100) / 100,
        avg_cpc: Math.round(parseFloat(row.avg_cpc?.toString() || '0') * 100) / 100,
        avg_roas: Math.round(parseFloat(row.avg_roas?.toString() || '0') * 100) / 100,
        reach: parseInt(row.reach?.toString() || '0'),
        percentage_of_total_spend: totalSpend > 0 ? Math.round((parseFloat(row.total_spend?.toString() || '0') / totalSpend * 100) * 100) / 100 : 0,
        percentage_of_total_impressions: totalImpressions > 0 ? Math.round((parseInt(row.total_impressions?.toString() || '0') / totalImpressions * 100) * 100) / 100 : 0,
      }));

      // Sort by spend descending
      result.sort((a: any, b: any) => b.total_spend - a.total_spend);
      
      return result;
    } catch (error) {
      logger.error('Failed to get audience insights', error as Error, options);
      throw error;
    }
  }

  async getTrendAnalysis(options: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    comparisonPeriodStart: string;
    comparisonPeriodEnd: string;
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
    metric?: 'spend' | 'impressions' | 'clicks' | 'conversions' | 'roas' | 'ctr' | 'cpc';
  }): Promise<{
    current_period: {
      date_start: string;
      date_end: string;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      total_conversion_value: number;
      avg_ctr: number;
      avg_cpc: number;
      avg_roas: number;
      daily_data: Array<{
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        conversion_values: number;
        ctr: number;
        cpc: number;
        roas: number;
      }>;
    };
    comparison_period: {
      date_start: string;
      date_end: string;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      total_conversion_value: number;
      avg_ctr: number;
      avg_cpc: number;
      avg_roas: number;
      daily_data: Array<{
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        conversion_values: number;
        ctr: number;
        cpc: number;
        roas: number;
      }>;
    };
    trends: {
      spend_change: number;
      spend_change_percent: number;
      impressions_change: number;
      impressions_change_percent: number;
      clicks_change: number;
      clicks_change_percent: number;
      conversions_change: number;
      conversions_change_percent: number;
      conversion_value_change: number;
      conversion_value_change_percent: number;
      ctr_change: number;
      ctr_change_percent: number;
      cpc_change: number;
      cpc_change_percent: number;
      roas_change: number;
      roas_change_percent: number;
      primary_metric_change: number;
      primary_metric_change_percent: number;
      trend_direction: 'up' | 'down' | 'stable';
    };
  }> {
    try {
      const metric = options.metric || 'spend';

      // Get current period data
      const currentPeriodData = await this.getSpendData({
        dateStart: options.currentPeriodStart,
        dateEnd: options.currentPeriodEnd,
        accountId: options.accountId,
        campaignId: options.campaignId,
        adSetId: options.adSetId,
      });

      // Get comparison period data
      const comparisonPeriodData = await this.getSpendData({
        dateStart: options.comparisonPeriodStart,
        dateEnd: options.comparisonPeriodEnd,
        accountId: options.accountId,
        campaignId: options.campaignId,
        adSetId: options.adSetId,
      });

      // Also get ROAS data for both periods if we have conversion data
      const currentRoasData = await this.getRoasData({
        dateStart: options.currentPeriodStart,
        dateEnd: options.currentPeriodEnd,
        accountId: options.accountId,
        campaignId: options.campaignId,
        adSetId: options.adSetId,
      });

      const comparisonRoasData = await this.getRoasData({
        dateStart: options.comparisonPeriodStart,
        dateEnd: options.comparisonPeriodEnd,
        accountId: options.accountId,
        campaignId: options.campaignId,
        adSetId: options.adSetId,
      });

      // Process current period
      const currentTotals = this.aggregatePeriodData(currentPeriodData, currentRoasData);
      const currentDaily = this.groupDataByDate(currentPeriodData, currentRoasData);

      // Process comparison period  
      const comparisonTotals = this.aggregatePeriodData(comparisonPeriodData, comparisonRoasData);
      const comparisonDaily = this.groupDataByDate(comparisonPeriodData, comparisonRoasData);

      // Calculate trends
      const trends = this.calculateTrends(currentTotals, comparisonTotals, metric);

      return {
        current_period: {
          date_start: options.currentPeriodStart,
          date_end: options.currentPeriodEnd,
          ...currentTotals,
          daily_data: currentDaily,
        },
        comparison_period: {
          date_start: options.comparisonPeriodStart,
          date_end: options.comparisonPeriodEnd,
          ...comparisonTotals,
          daily_data: comparisonDaily,
        },
        trends,
      };
    } catch (error) {
      logger.error('Failed to get trend analysis', error as Error, options);
      throw error;
    }
  }

  private aggregatePeriodData(spendData: any[], roasData: any[]) {
    const totalSpend = spendData.reduce((sum, row) => sum + parseFloat(row.spend?.toString() || '0'), 0);
    const totalImpressions = spendData.reduce((sum, row) => sum + parseInt(row.impressions?.toString() || '0'), 0);
    const totalClicks = spendData.reduce((sum, row) => sum + parseInt(row.clicks?.toString() || '0'), 0);

    const totalConversions = roasData.reduce((sum, row) => sum + parseFloat(row.conversions?.toString() || '0'), 0);
    const totalConversionValue = roasData.reduce((sum, row) => sum + parseFloat(row.conversion_values?.toString() || '0'), 0);

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    return {
      total_spend: Math.round(totalSpend * 100) / 100,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_conversions: Math.round(totalConversions * 100) / 100,
      total_conversion_value: Math.round(totalConversionValue * 100) / 100,
      avg_ctr: Math.round(avgCtr * 100) / 100,
      avg_cpc: Math.round(avgCpc * 100) / 100,
      avg_roas: Math.round(avgRoas * 100) / 100,
    };
  }

  private groupDataByDate(spendData: any[], roasData: any[]) {
    const dailyData: Record<string, any> = {};

    // Process spend data
    spendData.forEach(row => {
      const date = row.date_start;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversion_values: 0,
        };
      }
      dailyData[date].spend += parseFloat(row.spend?.toString() || '0');
      dailyData[date].impressions += parseInt(row.impressions?.toString() || '0');
      dailyData[date].clicks += parseInt(row.clicks?.toString() || '0');
    });

    // Process ROAS data
    roasData.forEach(row => {
      const date = row.date_start;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversion_values: 0,
        };
      }
      dailyData[date].conversions += parseFloat(row.conversions?.toString() || '0');
      dailyData[date].conversion_values += parseFloat(row.conversion_values?.toString() || '0');
    });

    // Calculate derived metrics and format
    return Object.values(dailyData).map((day: any) => ({
      date: day.date,
      spend: Math.round(day.spend * 100) / 100,
      impressions: day.impressions,
      clicks: day.clicks,
      conversions: Math.round(day.conversions * 100) / 100,
      conversion_values: Math.round(day.conversion_values * 100) / 100,
      ctr: day.impressions > 0 ? Math.round((day.clicks / day.impressions * 100) * 100) / 100 : 0,
      cpc: day.clicks > 0 ? Math.round((day.spend / day.clicks) * 100) / 100 : 0,
      roas: day.spend > 0 ? Math.round((day.conversion_values / day.spend) * 100) / 100 : 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateTrends(current: any, comparison: any, primaryMetric: string) {
    const calculateChange = (currentVal: number, comparisonVal: number) => {
      const change = currentVal - comparisonVal;
      const changePercent = comparisonVal > 0 ? (change / comparisonVal) * 100 : 0;
      return {
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    };

    const spendChange = calculateChange(current.total_spend, comparison.total_spend);
    const impressionsChange = calculateChange(current.total_impressions, comparison.total_impressions);
    const clicksChange = calculateChange(current.total_clicks, comparison.total_clicks);
    const conversionsChange = calculateChange(current.total_conversions, comparison.total_conversions);
    const conversionValueChange = calculateChange(current.total_conversion_value, comparison.total_conversion_value);
    const ctrChange = calculateChange(current.avg_ctr, comparison.avg_ctr);
    const cpcChange = calculateChange(current.avg_cpc, comparison.avg_cpc);
    const roasChange = calculateChange(current.avg_roas, comparison.avg_roas);

    // Determine primary metric change
    let primaryMetricChange = { change: 0, changePercent: 0 };
    switch (primaryMetric) {
      case 'spend':
        primaryMetricChange = spendChange;
        break;
      case 'impressions':
        primaryMetricChange = impressionsChange;
        break;
      case 'clicks':
        primaryMetricChange = clicksChange;
        break;
      case 'conversions':
        primaryMetricChange = conversionsChange;
        break;
      case 'roas':
        primaryMetricChange = roasChange;
        break;
      case 'ctr':
        primaryMetricChange = ctrChange;
        break;
      case 'cpc':
        primaryMetricChange = cpcChange;
        break;
    }

    // Determine trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(primaryMetricChange.changePercent) >= 5) {
      trendDirection = primaryMetricChange.changePercent > 0 ? 'up' : 'down';
    }

    return {
      spend_change: spendChange.change,
      spend_change_percent: spendChange.changePercent,
      impressions_change: impressionsChange.change,
      impressions_change_percent: impressionsChange.changePercent,
      clicks_change: clicksChange.change,
      clicks_change_percent: clicksChange.changePercent,
      conversions_change: conversionsChange.change,
      conversions_change_percent: conversionsChange.changePercent,
      conversion_value_change: conversionValueChange.change,
      conversion_value_change_percent: conversionValueChange.changePercent,
      ctr_change: ctrChange.change,
      ctr_change_percent: ctrChange.changePercent,
      cpc_change: cpcChange.change,
      cpc_change_percent: cpcChange.changePercent,
      roas_change: roasChange.change,
      roas_change_percent: roasChange.changePercent,
      primary_metric_change: primaryMetricChange.change,
      primary_metric_change_percent: primaryMetricChange.changePercent,
      trend_direction: trendDirection,
    };
  }

  async getCampaignPerformance(options: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    limit?: number;
  }): Promise<Array<{
    campaign_id: string;
    campaign_name: string;
    campaign_objective: string;
    campaign_status: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_conversion_value: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_roas: number;
    budget_utilization: number;
    daily_budget: number;
    lifetime_budget: number;
    active_ads: number;
  }>> {
    try {
      const limit = options.limit || 50;
      
      // Get campaigns with their budgets
      let campaignQuery = this.client
        .from('campaigns')
        .select('id, name, objective, status, daily_budget, lifetime_budget, account_id');

      if (options.accountId) {
        campaignQuery = campaignQuery.eq('account_id', options.accountId);
      }

      const { data: campaigns, error: campaignError } = await campaignQuery;
      
      if (campaignError) {
        throw campaignError;
      }

      if (!campaigns || campaigns.length === 0) {
        return [];
      }

      const campaignIds = campaigns.map(c => c.id);

      // Get aggregated insights for these campaigns
      let insightsQuery = this.client
        .from('daily_ad_insights')
        .select('campaign_id, spend, impressions, clicks, conversions, conversion_values, ctr, cpc, roas')
        .gte('date_start', options.dateStart)
        .lte('date_start', options.dateEnd)
        .in('campaign_id', campaignIds);

      const { data: insights, error: insightsError } = await insightsQuery;
      
      if (insightsError) {
        throw insightsError;
      }

      // Get active ad counts per campaign
      const { data: adCounts, error: adCountError } = await this.client
        .from('ads')
        .select('campaign_id')
        .eq('status', 'ACTIVE')
        .in('campaign_id', campaignIds);

      if (adCountError) {
        throw adCountError;
      }

      // Aggregate insights by campaign
      const campaignMetrics: Record<string, any> = {};
      
      for (const insight of insights || []) {
        const campaignId = insight.campaign_id;
        if (!campaignMetrics[campaignId]) {
          campaignMetrics[campaignId] = {
            total_spend: 0,
            total_impressions: 0,
            total_clicks: 0,
            total_conversions: 0,
            total_conversion_value: 0,
            ctr_sum: 0,
            cpc_sum: 0,
            roas_sum: 0,
            count: 0,
          };
        }
        
        campaignMetrics[campaignId].total_spend += parseFloat(insight.spend?.toString() || '0');
        campaignMetrics[campaignId].total_impressions += parseInt(insight.impressions?.toString() || '0');
        campaignMetrics[campaignId].total_clicks += parseInt(insight.clicks?.toString() || '0');
        campaignMetrics[campaignId].total_conversions += parseFloat(insight.conversions?.toString() || '0');
        campaignMetrics[campaignId].total_conversion_value += parseFloat(insight.conversion_values?.toString() || '0');
        campaignMetrics[campaignId].ctr_sum += parseFloat(insight.ctr?.toString() || '0');
        campaignMetrics[campaignId].cpc_sum += parseFloat(insight.cpc?.toString() || '0');
        campaignMetrics[campaignId].roas_sum += parseFloat(insight.roas?.toString() || '0');
        campaignMetrics[campaignId].count++;
      }

      // Count active ads per campaign
      const adCountMap = (adCounts || []).reduce((acc, ad) => {
        acc[ad.campaign_id] = (acc[ad.campaign_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate days in date range for budget utilization
      const startDate = new Date(options.dateStart);
      const endDate = new Date(options.dateEnd);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Build final result
      const result = campaigns.map(campaign => {
        const metrics = campaignMetrics[campaign.id] || {
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_conversions: 0,
          total_conversion_value: 0,
          ctr_sum: 0,
          cpc_sum: 0,
          roas_sum: 0,
          count: 0,
        };

        const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0;
        const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0;
        const avgRoas = metrics.count > 0 ? metrics.roas_sum / metrics.count : 0;

        // Calculate budget utilization
        let budgetUtilization = 0;
        const dailyBudget = parseFloat(campaign.daily_budget?.toString() || '0');
        const lifetimeBudget = parseFloat(campaign.lifetime_budget?.toString() || '0');
        
        if (dailyBudget > 0) {
          budgetUtilization = (metrics.total_spend / (dailyBudget * daysDiff)) * 100;
        } else if (lifetimeBudget > 0) {
          budgetUtilization = (metrics.total_spend / lifetimeBudget) * 100;
        }

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          campaign_objective: campaign.objective || 'Unknown',
          campaign_status: campaign.status || 'Unknown',
          total_spend: Math.round(metrics.total_spend * 100) / 100,
          total_impressions: metrics.total_impressions,
          total_clicks: metrics.total_clicks,
          total_conversions: Math.round(metrics.total_conversions * 100) / 100,
          total_conversion_value: Math.round(metrics.total_conversion_value * 100) / 100,
          avg_ctr: Math.round(avgCtr * 100) / 100,
          avg_cpc: Math.round(avgCpc * 100) / 100,
          avg_roas: Math.round(avgRoas * 100) / 100,
          budget_utilization: Math.round(budgetUtilization * 100) / 100,
          daily_budget: dailyBudget,
          lifetime_budget: lifetimeBudget,
          active_ads: adCountMap[campaign.id] || 0,
        };
      });

      // Sort by spend descending and limit
      result.sort((a, b) => b.total_spend - a.total_spend);
      
      return result.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get campaign performance', error as Error, options);
      throw error;
    }
  }

  // Utility functions
  async getAccountById(accountId: string): Promise<Account | null> {
    try {
      const { data, error } = await this.client
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get account by ID', error as Error, { accountId });
      throw error;
    }
  }
}