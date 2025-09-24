import { MetaInsight } from '../database/types';
import { logger } from '../utils/logger';

export interface TransformedInsight {
  date_start: string;
  account_id: string;
  campaign_id: string;
  ad_set_id: string;
  ad_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  frequency?: number;
  // Separate conversion types
  purchases?: number;
  leads?: number;
  registrations?: number;
  add_to_carts?: number;
  // Conversion values  
  purchase_values?: number;
  lead_values?: number;
  registration_values?: number;
  // Calculated metrics
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  purchase_cpa?: number;
  purchase_roas?: number;
  // Legacy field for backward compatibility
  conversions?: number;
  conversion_values?: number;
  cost_per_conversion?: number;
  link_clicks?: number;
  video_views?: number;
  video_thruplay_watched_actions?: number;
  video_15_sec_watched_actions?: number;
  video_30_sec_watched_actions?: number;
  video_p25_watched_actions?: number;
  video_p50_watched_actions?: number;
  video_p75_watched_actions?: number;
  video_p95_watched_actions?: number;
  video_p100_watched_actions?: number;
  video_avg_time_watched_actions?: number;
}

export class DataTransformer {
  static transformMetaInsight(insight: MetaInsight): TransformedInsight {
    try {
      // Helper function to extract action value by type
      const getActionValue = (actions: Array<{ action_type: string; value: string }> = [], actionType: string): number => {
        const action = actions.find(a => a.action_type === actionType);
        return action ? parseFloat(action.value) || 0 : 0;
      };

      // Helper function to safely parse numeric strings
      const parseNumeric = (value: string | undefined): number => {
        if (!value) return 0;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Extract separate conversion types
      const purchases = getActionValue(insight.actions, 'purchase');
      const leads = getActionValue(insight.actions, 'lead');
      const registrations = getActionValue(insight.actions, 'complete_registration');
      const addToCarts = getActionValue(insight.actions, 'add_to_cart');

      // Extract conversion values by type
      const purchaseValues = getActionValue(insight.action_values, 'purchase');
      const leadValues = getActionValue(insight.action_values, 'lead');
      const registrationValues = getActionValue(insight.action_values, 'complete_registration');

      // Extract cost per action by type
      const purchaseCPA = getActionValue(insight.cost_per_action_type, 'purchase');

      // Calculate core metrics
      const impressions = parseNumeric(insight.impressions);
      const clicks = parseNumeric(insight.clicks);
      const spend = parseNumeric(insight.spend);

      // Extract link clicks (used for CTR/CPC to match Ads Manager)
      const linkClicks = getActionValue(insight.actions, 'link_click');
      
      // Calculate CTR, CPC, CPM with high precision (no rounding during calculation)
      // Use link_clicks for CTR/CPC to match Meta Ads Manager behavior
      const ctr = impressions > 0 && linkClicks > 0 ? (linkClicks / impressions) * 100 : 0;
      const cpc = linkClicks > 0 ? spend / linkClicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

      // Calculate purchase-specific metrics with high precision
      const calculatedPurchaseCPA = purchases > 0 ? spend / purchases : undefined;
      const purchaseROAS = purchaseValues > 0 && spend > 0 ? purchaseValues / spend : undefined;

      // Legacy total conversions for backward compatibility
      const totalConversions = purchases + leads + registrations + addToCarts;
      const totalConversionValues = purchaseValues + leadValues + registrationValues;
      
      // Helper function to extract video action values properly
      const getVideoActionValue = (videoActions: any): number => {
        if (!videoActions) return 0;
        
        // Handle different response formats from Meta API
        if (Array.isArray(videoActions)) {
          // Multiple action types - find the one we want
          const action = videoActions.find(a => a.action_type === 'video_view' || !a.action_type);
          return action ? parseFloat(action.value) || 0 : 0;
        } else if (typeof videoActions === 'object' && videoActions.value) {
          // Single action object
          return parseFloat(videoActions.value) || 0;
        } else if (typeof videoActions === 'string' || typeof videoActions === 'number') {
          // Direct value
          return parseFloat(videoActions.toString()) || 0;
        }
        
        return 0;
      };

      // Video metrics - robust parsing for different Meta API response formats
      const videoViews = getActionValue(insight.actions, 'video_view');
      const videoThruplay = getVideoActionValue(insight.video_thruplay_watched_actions);
      const video15Sec = getVideoActionValue(insight.video_15_sec_watched_actions);
      const video30Sec = getVideoActionValue(insight.video_30_sec_watched_actions);
      const videoP25 = getVideoActionValue(insight.video_p25_watched_actions);
      const videoP50 = getVideoActionValue(insight.video_p50_watched_actions);
      const videoP75 = getVideoActionValue(insight.video_p75_watched_actions);
      const videoP95 = getVideoActionValue(insight.video_p95_watched_actions);
      const videoP100 = getVideoActionValue(insight.video_p100_watched_actions);
      const videoAvgTime = parseNumeric(insight.video_avg_time_watched_actions?.toString());

      const transformed: TransformedInsight = {
        date_start: insight.date_start,
        account_id: insight.account_id,
        campaign_id: insight.campaign_id,
        ad_set_id: insight.adset_id,
        ad_id: insight.ad_id,
        impressions,
        clicks,
        spend,
        reach: parseNumeric(insight.reach),
        frequency: parseNumeric(insight.frequency),
        // Separate conversion types
        purchases: purchases > 0 ? purchases : undefined,
        leads: leads > 0 ? leads : undefined,
        registrations: registrations > 0 ? registrations : undefined,
        add_to_carts: addToCarts > 0 ? addToCarts : undefined,
        // Conversion values by type
        purchase_values: purchaseValues > 0 ? purchaseValues : undefined,
        lead_values: leadValues > 0 ? leadValues : undefined,
        registration_values: registrationValues > 0 ? registrationValues : undefined,
        // Calculated metrics - store with high precision, round only at display layer
        ctr: ctr,
        cpc: cpc,
        cpm: cpm,
        purchase_cpa: calculatedPurchaseCPA,
        purchase_roas: purchaseROAS,
        // Legacy ROAS calculation
        roas: purchaseROAS || (totalConversionValues > 0 && spend > 0 ? totalConversionValues / spend : 0),
        // Legacy fields for backward compatibility
        conversions: totalConversions > 0 ? totalConversions : undefined,
        conversion_values: totalConversionValues > 0 ? totalConversionValues : undefined,
        cost_per_conversion: purchaseCPA > 0 ? purchaseCPA : undefined,
        link_clicks: linkClicks > 0 ? linkClicks : undefined,
        // Video metrics: Store all values including 0 - only use undefined for truly missing data
        video_views: videoViews,
        video_thruplay_watched_actions: videoThruplay,
        video_15_sec_watched_actions: video15Sec,
        video_30_sec_watched_actions: video30Sec,
        video_p25_watched_actions: videoP25,
        video_p50_watched_actions: videoP50,
        video_p75_watched_actions: videoP75,
        video_p95_watched_actions: videoP95,
        video_p100_watched_actions: videoP100,
        video_avg_time_watched_actions: videoAvgTime,
      };

      logger.debug('Transformed insight', {
        adId: insight.ad_id,
        date: insight.date_start,
        spend: transformed.spend,
        purchases: transformed.purchases,
        totalConversions: transformed.conversions,
        ctr: transformed.ctr,
        cpc: transformed.cpc,
        purchaseCPA: transformed.purchase_cpa,
        // Video metrics debugging
        videoViews: transformed.video_views,
        videoThruplay: transformed.video_thruplay_watched_actions,
        video15Sec: transformed.video_15_sec_watched_actions,
      });

      return transformed;
    } catch (error) {
      logger.error('Failed to transform Meta insight', error as Error, { insight });
      throw new Error(`Data transformation failed for insight: ${insight.ad_id}`);
    }
  }

  static transformBatchInsights(insights: MetaInsight[]): TransformedInsight[] {
    const transformed: TransformedInsight[] = [];
    const errors: string[] = [];

    for (const insight of insights) {
      try {
        transformed.push(this.transformMetaInsight(insight));
      } catch (error) {
        errors.push(`Failed to transform insight for ad ${insight.ad_id}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Some insights failed to transform', { 
        errorCount: errors.length,
        totalCount: insights.length,
        errors: errors.slice(0, 5) // Log first 5 errors
      });
    }

    logger.info('Batch transformation completed', {
      inputCount: insights.length,
      outputCount: transformed.length,
      errorCount: errors.length,
    });

    return transformed;
  }

  static validateInsight(insight: TransformedInsight): boolean {
    // Required fields validation
    const required = [
      'date_start',
      'account_id', 
      'campaign_id',
      'ad_set_id',
      'ad_id'
    ];

    for (const field of required) {
      if (!insight[field as keyof TransformedInsight]) {
        logger.warn('Missing required field in insight', { field, adId: insight.ad_id });
        return false;
      }
    }

    // Validate numeric fields are non-negative
    const numericFields = ['impressions', 'clicks', 'spend', 'reach', 'frequency'];
    for (const field of numericFields) {
      const value = insight[field as keyof TransformedInsight] as number;
      if (typeof value === 'number' && value < 0) {
        logger.warn('Negative value in numeric field', { field, value, adId: insight.ad_id });
        return false;
      }
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(insight.date_start)) {
      logger.warn('Invalid date format', { date: insight.date_start, adId: insight.ad_id });
      return false;
    }

    // Data quality checks for video metrics
    this.validateVideoMetricsQuality(insight);

    return true;
  }

  static validateVideoMetricsQuality(insight: TransformedInsight): void {
    const adId = insight.ad_id;
    const date = insight.date_start;
    
    // Check for suspicious video metrics patterns
    const impressions = insight.impressions || 0;
    const videoViews = insight.video_views || 0;
    const thruplay = insight.video_thruplay_watched_actions || 0;
    const video15Sec = insight.video_15_sec_watched_actions || 0;
    
    // Flag if video views exceed impressions (data quality issue)
    if (videoViews > impressions) {
      logger.warn('Video views exceed impressions - potential data quality issue', {
        adId, date, impressions, videoViews
      });
    }
    
    // Flag if ThruPlay exceeds video views (logical inconsistency)
    if (thruplay > videoViews && videoViews > 0) {
      logger.warn('ThruPlay exceeds video views - potential data quality issue', {
        adId, date, videoViews, thruplay
      });
    }
    
    // Flag if 15-sec views significantly differ from ThruPlay (they should be similar)
    if (thruplay > 0 && video15Sec > 0 && Math.abs(thruplay - video15Sec) / Math.max(thruplay, video15Sec) > 0.1) {
      logger.warn('ThruPlay and 15-sec views significantly differ - check data source', {
        adId, date, thruplay, video15Sec, difference: Math.abs(thruplay - video15Sec)
      });
    }
    
    // Flag missing video data when impressions exist
    if (impressions > 1000 && videoViews === 0 && thruplay === 0) {
      logger.warn('Missing video metrics despite significant impressions', {
        adId, date, impressions, videoViews, thruplay
      });
    }
  }

  static filterValidInsights(insights: TransformedInsight[]): TransformedInsight[] {
    const valid = insights.filter(insight => this.validateInsight(insight));
    
    if (valid.length !== insights.length) {
      logger.warn('Some insights filtered out due to validation errors', {
        inputCount: insights.length,
        validCount: valid.length,
        filteredCount: insights.length - valid.length,
      });
    }

    return valid;
  }
}