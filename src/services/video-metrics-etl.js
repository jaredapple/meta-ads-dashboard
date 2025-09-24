const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

class VideoMetricsETL {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.metaAccessToken = process.env.META_ACCESS_TOKEN;
  }

  async syncVideoMetrics(accountId, daysBack = 7) {
    console.log(`🎬 Starting video metrics sync for account ${accountId}`);
    
    try {
      // Get active accounts
      const { data: accounts } = await this.supabase
        .from('client_accounts')
        .select('*')
        .eq('meta_account_id', accountId)
        .eq('is_active', true);

      if (!accounts || accounts.length === 0) {
        console.log('❌ No active account found');
        return;
      }

      const account = accounts[0];
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const dateRangeStr = `${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`;
      
      // Fetch video insights from Meta API
      const insights = await this.fetchVideoInsights(accountId, dateRangeStr);
      
      if (insights.length === 0) {
        console.log('📭 No video insights found');
        return;
      }

      // Process and store insights
      let processed = 0;
      for (const insight of insights) {
        await this.processVideoInsight(account, insight);
        processed++;
      }

      console.log(`✅ Processed ${processed} video insights`);
      
    } catch (error) {
      console.error('❌ Error syncing video metrics:', error.message);
      throw error;
    }
  }

  async fetchVideoInsights(accountId, dateRange) {
    const url = `https://graph.facebook.com/v21.0/act_${accountId}/insights`;
    
    const params = {
      access_token: this.metaAccessToken,
      level: 'ad',
      time_range: `{"since":"${dateRange.split('..')[0]}","until":"${dateRange.split('..')[1]}"}`,
      time_increment: 1, // CRITICAL: Get daily breakdown instead of aggregated data
      fields: [
        'ad_id',
        'ad_name', 
        'campaign_id',
        'campaign_name',
        'adset_id',
        'date_start',
        'impressions',
        'spend',
        'actions',
        'video_play_actions',
        'video_thruplay_watched_actions',
        'video_15_sec_watched_actions',
        'video_30_sec_watched_actions', 
        'video_p25_watched_actions',
        'video_p50_watched_actions',
        'video_p75_watched_actions',
        'video_p95_watched_actions',
        'video_p100_watched_actions',
        'video_avg_time_watched_actions',
        'clicks',
        'inline_link_clicks',
        'conversions',
        'conversion_values'
      ].join(','),
      limit: 1000
    };

    console.log(`📡 Fetching video insights from Meta API...`);
    
    try {
      const response = await axios.get(url, { params });
      
      if (!response.data || !response.data.data) {
        console.log('📭 No data returned from Meta API');
        return [];
      }

      // Filter for video ads only
      const videoInsights = response.data.data.filter(insight => 
        this.hasVideoMetrics(insight)
      );

      console.log(`📊 Found ${videoInsights.length} video ad insights`);
      return videoInsights;

    } catch (error) {
      console.error('❌ Meta API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  hasVideoMetrics(insight) {
    // Check if this insight has any video-related metrics
    const videoFields = [
      'video_play_actions',
      'video_thruplay_watched_actions', 
      'video_15_sec_watched_actions',
      'video_p25_watched_actions'
    ];
    
    // Also check for video_view in actions (3-second views)
    const hasVideoViewAction = this.extractVideoViewsFromActions(insight.actions) > 0;
    
    const hasVideoFields = videoFields.some(field => 
      insight[field] && this.parseMetricValue(insight[field]) > 0
    );
    
    return hasVideoFields || hasVideoViewAction;
  }

  async processVideoInsight(account, insight) {
    // Parse conversion data
    let totalConversions = 0;
    let totalConversionValue = 0;

    if (insight.actions && Array.isArray(insight.actions)) {
      insight.actions.forEach(action => {
        if (['purchase', 'complete_registration', 'lead', 'add_to_cart'].includes(action.action_type)) {
          totalConversions += parseFloat(action.value || 0);
        }
      });
    }

    if (insight.conversion_values && Array.isArray(insight.conversion_values)) {
      insight.conversion_values.forEach(actionValue => {
        if (actionValue.action_type === 'purchase') {
          totalConversionValue += parseFloat(actionValue.value || 0);
        }
      });
    }

    const videoMetricData = {
      date_start: insight.date_start,
      ad_id: insight.ad_id,
      ad_set_id: insight.adset_id,
      campaign_id: insight.campaign_id,
      account_id: account.meta_account_id,
      
      // Ad details
      ad_name: insight.ad_name || 'Unknown Ad',
      campaign_name: insight.campaign_name || 'Unknown Campaign',
      
      // Core metrics
      impressions: parseInt(insight.impressions || '0'),
      spend: parseFloat(insight.spend || '0'),
      
      // Video metrics - parse carefully from Meta API
      video_plays: this.parseMetricValue(insight.video_play_actions),
      video_3sec_views: this.extractVideoViewsFromActions(insight.actions), // Extract 3-sec views from actions
      video_15sec_views: this.parseMetricValue(insight.video_thruplay_watched_actions), // ThruPlay is actually 15-sec/completion
      video_30sec_views: this.parseMetricValue(insight.video_30_sec_watched_actions),
      video_p25_watched: this.parseMetricValue(insight.video_p25_watched_actions),
      video_p50_watched: this.parseMetricValue(insight.video_p50_watched_actions),
      video_p75_watched: this.parseMetricValue(insight.video_p75_watched_actions),
      video_p100_watched: this.parseMetricValue(insight.video_p100_watched_actions),
      video_avg_watch_time: parseFloat(insight.video_avg_time_watched_actions || '0'),
      
      // Business metrics
      clicks: parseInt(insight.clicks || '0'),
      link_clicks: parseInt(insight.inline_link_clicks || '0'),
      conversions: totalConversions,
      conversion_values: totalConversionValue
    };

    try {
      await this.supabase
        .from('video_metrics')
        .upsert(videoMetricData, {
          onConflict: 'ad_id,date_start'
        });

      console.log(`  ✅ Processed video metrics for ad ${insight.ad_id} (${videoMetricData.video_3sec_views} thumbstops)`);

    } catch (error) {
      console.error(`  ❌ Error storing video metrics for ad ${insight.ad_id}:`, error.message);
    }
  }

  parseMetricValue(metricValue) {
    if (!metricValue) return 0;
    
    // Handle different formats from Meta API
    if (typeof metricValue === 'string') {
      try {
        const parsed = JSON.parse(metricValue);
        return Array.isArray(parsed) ? (parsed[0]?.value || 0) : parsed;
      } catch (e) {
        return parseFloat(metricValue) || 0;
      }
    } else if (Array.isArray(metricValue)) {
      return metricValue[0]?.value || metricValue[0] || 0;
    } else {
      return parseFloat(metricValue) || 0;
    }
  }

  extractVideoViewsFromActions(actions) {
    if (!actions || !Array.isArray(actions)) return 0;
    
    // Find video_view action (3-second views)
    const videoViewAction = actions.find(action => action.action_type === 'video_view');
    return videoViewAction ? parseFloat(videoViewAction.value) || 0 : 0;
  }

  async syncAllAccountsVideoMetrics(daysBack = 7) {
    console.log('🚀 Starting video metrics sync for all accounts\n');
    
    const { data: accounts } = await this.supabase
      .from('client_accounts')
      .select('*')
      .eq('is_active', true);

    if (!accounts || accounts.length === 0) {
      console.log('❌ No active accounts found');
      return;
    }

    console.log(`Found ${accounts.length} active accounts\n`);

    for (const account of accounts) {
      try {
        console.log(`🔄 Syncing video metrics for ${account.client_name}`);
        await this.syncVideoMetrics(account.meta_account_id, daysBack);
        console.log(`✅ Completed ${account.client_name}\n`);
      } catch (error) {
        console.error(`❌ Failed to sync ${account.client_name}:`, error.message);
      }
    }

    console.log('🏁 Video metrics sync completed for all accounts');
  }
}

module.exports = { VideoMetricsETL };

// CLI usage
if (require.main === module) {
  const etl = new VideoMetricsETL();
  const daysBack = parseInt(process.argv[2]) || 7;
  etl.syncAllAccountsVideoMetrics(daysBack).catch(console.error);
}