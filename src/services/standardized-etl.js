const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class StandardizedETLService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.apiVersion = 'v21.0';
    
    // Simple encryption setup
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    const salt = crypto.createHash('sha256').update('meta-mcp-salt').digest();
    this.encryptionKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  }

  decryptToken(tokenData) {
    if (!tokenData) return '';
    
    // Check if token is already plaintext (starts with EAA for Meta tokens)
    if (tokenData.startsWith('EAA')) {
      return tokenData;
    }
    
    // Try to decrypt if it's encrypted
    try {
      const combined = Buffer.from(tokenData, 'base64');
      const iv = combined.slice(0, 16);
      const authTag = combined.slice(16, 32);
      const encrypted = combined.slice(32);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      // If decryption fails, assume it's plaintext
      console.warn(`Token decryption failed, assuming plaintext: ${error.message}`);
      return tokenData;
    }
  }

  async getActiveAccounts() {
    const { data, error } = await this.supabase
      .from('client_accounts')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    // Decrypt access tokens
    return data.map(account => ({
      ...account,
      access_token: this.decryptToken(account.access_token)
    }));
  }

  async syncAccount(account, daysBack = 3) {
    console.log(`\n🔄 Starting standardized sync for ${account.client_name}`);
    
    try {
      // Update sync status
      await this.updateSyncStatus(account.id, 'syncing');

      // 1. Sync account metadata
      await this.syncAccountMetadata(account);

      // 2. Sync campaign structure
      await this.syncCampaignStructure(account);

      // 3. Try to sync individual-level insights first (preferred)
      const individualDataAvailable = await this.syncIndividualInsights(account, daysBack);
      
      // 4. Only sync account-level aggregated data if individual data failed
      if (!individualDataAvailable) {
        console.log(`    ⚠️  Individual insights failed, falling back to account-level aggregated data`);
        await this.syncInsightsData(account, daysBack);
      }

      // 6. Update computed metrics
      await this.updateComputedMetrics(account);

      // Mark as complete
      await this.updateSyncStatus(account.id, 'completed');
      console.log(`✅ Successfully synced ${account.client_name}`);

    } catch (error) {
      console.error(`❌ Error syncing ${account.client_name}:`, error.message);
      await this.updateSyncStatus(account.id, 'failed');
      throw error;
    }
  }

  async updateSyncStatus(accountId, status) {
    await this.supabase
      .from('client_accounts')
      .update({ 
        sync_status: status,
        last_sync: new Date().toISOString()
      })
      .eq('id', accountId);
  }

  async syncAccountMetadata(account) {
    console.log(`  📋 Syncing account metadata for ${account.client_name}`);
    
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/act_${account.meta_account_id}`,
      {
        params: {
          access_token: account.access_token,
          fields: 'id,name,currency,timezone_name,account_status'
        }
      }
    );

    const accountData = response.data;
    
    // Update accounts table
    await this.supabase
      .from('accounts')
      .upsert({
        id: account.meta_account_id,
        name: accountData.name,
        currency: accountData.currency || account.currency,
        timezone: accountData.timezone_name || account.timezone,
        status: accountData.account_status || 'ACTIVE'
      });
  }

  async syncCampaignStructure(account) {
    console.log(`  🎯 Syncing campaign structure for ${account.client_name}`);
    
    // Get campaigns
    const campaignsResponse = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/act_${account.meta_account_id}/campaigns`,
      {
        params: {
          access_token: account.access_token,
          fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
          limit: 500
        }
      }
    );

    const campaigns = campaignsResponse.data.data || [];
    console.log(`    Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      // Upsert campaign
      await this.supabase
        .from('campaigns')
        .upsert({
          id: campaign.id,
          account_id: account.meta_account_id,
          name: campaign.name,
          objective: campaign.objective || 'OUTCOME_TRAFFIC',
          status: campaign.status || 'PAUSED',
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          start_time: campaign.start_time || null,
          stop_time: campaign.stop_time || null,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time
        });

      // Get ad sets for this campaign
      await this.syncAdSets(account, campaign.id);
    }
  }

  async syncAdSets(account, campaignId) {
    try {
      const adSetsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${campaignId}/adsets`,
        {
          params: {
            access_token: account.access_token,
            fields: 'id,name,status,daily_budget,lifetime_budget,created_time,updated_time',
            limit: 500
          }
        }
      );

      const adSets = adSetsResponse.data.data || [];
      
      for (const adSet of adSets) {
        await this.supabase
          .from('ad_sets')
          .upsert({
            id: adSet.id,
            campaign_id: campaignId,
            account_id: account.meta_account_id,
            name: adSet.name,
            status: adSet.status || 'PAUSED',
            daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
            lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
            created_time: adSet.created_time,
            updated_time: adSet.updated_time
          });

        // Get ads for this ad set
        await this.syncAds(account, campaignId, adSet.id);
      }
    } catch (error) {
      console.warn(`    ⚠️  Could not sync ad sets for campaign ${campaignId}: ${error.message}`);
    }
  }

  async syncAds(account, campaignId, adSetId) {
    try {
      const adsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${adSetId}/ads`,
        {
          params: {
            access_token: account.access_token,
            fields: 'id,name,status,created_time,updated_time',
            limit: 500
          }
        }
      );

      const ads = adsResponse.data.data || [];
      
      for (const ad of ads) {
        await this.supabase
          .from('ads')
          .upsert({
            id: ad.id,
            ad_set_id: adSetId,
            campaign_id: campaignId,
            account_id: account.meta_account_id,
            name: ad.name,
            status: ad.status || 'PAUSED',
            created_time: ad.created_time,
            updated_time: ad.updated_time
          });
      }
    } catch (error) {
      console.warn(`    ⚠️  Could not sync ads for ad set ${adSetId}: ${error.message}`);
    }
  }

  async syncInsightsData(account, daysBack = 3) {
    console.log(`  📊 Syncing insights data for ${account.client_name}`);
    
    // Get last N days of data (default 3 for near real-time updates)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`    Date range: ${dateStart} to ${dateEnd} (${daysBack} days)`);

    // Get account-level insights for accurate totals (matches Meta Ads Manager)
    const insightsResponse = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/act_${account.meta_account_id}/insights`,
      {
        params: {
          access_token: account.access_token,
          level: 'account',  // Use account level for accurate data matching Meta Ads Manager
          fields: 'impressions,clicks,spend,reach,frequency,actions,action_values,purchase_roas,ctr,cpc,cpm,inline_link_clicks,outbound_clicks',
          time_range: JSON.stringify({
            since: dateStart,
            until: dateEnd
          }),
          time_increment: 1,
          limit: 100  // Account level has fewer records
        }
      }
    );

    const insights = insightsResponse.data.data || [];
    console.log(`    Found ${insights.length} account-level insights`);

    // Process each day's account-level insights 
    for (const insight of insights) {
      await this.processAccountInsightRecord(account, insight);
    }
  }

  async syncIndividualInsights(account, daysBack = 3) {
    console.log(`  🎯 Syncing individual-level insights for ${account.client_name}`);
    
    try {
      // First, clear out any existing account-level aggregated data for this date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const dateStart = startDate.toISOString().split('T')[0];
      const dateEnd = endDate.toISOString().split('T')[0];
      
      console.log(`    🧹 Cleaning account-level aggregated data for ${dateStart} to ${dateEnd}`);
      
      await this.supabase
        .from('daily_ad_insights')
        .delete()
        .eq('account_id', account.meta_account_id)
        .like('ad_id', 'account_%')
        .gte('date_start', dateStart)
        .lte('date_start', dateEnd);

      // Sync campaign-level insights
      await this.syncCampaignInsights(account, daysBack);
      
      // Sync ad-level insights
      await this.syncAdInsights(account, daysBack);
      
      console.log(`    ✅ Individual insights sync completed`);
      return true;
      
    } catch (error) {
      console.warn(`    ❌ Individual insights sync failed: ${error.message}`);
      return false;
    }
  }

  async syncCampaignInsights(account, daysBack = 3) {
    console.log(`  🎯 Syncing campaign-level insights for ${account.client_name}`);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`    Date range: ${dateStart} to ${dateEnd} (${daysBack} days)`);

    try {
      // Get campaign-level insights
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/act_${account.meta_account_id}/insights`,
        {
          params: {
            access_token: account.access_token,
            level: 'campaign',
            fields: 'campaign_id,impressions,clicks,spend,reach,frequency,actions,action_values,purchase_roas,ctr,cpc,cpm,inline_link_clicks,outbound_clicks,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions',
            time_range: JSON.stringify({
              since: dateStart,
              until: dateEnd
            }),
            time_increment: 1,
            limit: 500
          }
        }
      );

      const insights = insightsResponse.data.data || [];
      console.log(`    Found ${insights.length} campaign-level insights`);

      for (const insight of insights) {
        await this.processCampaignInsightRecord(account, insight);
      }
    } catch (error) {
      console.warn(`    ⚠️  Could not sync campaign insights: ${error.message}`);
    }
  }

  async syncAdInsights(account, daysBack = 3) {
    console.log(`  📢 Syncing ad-level insights for ${account.client_name}`);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = endDate.toISOString().split('T')[0];
    
    console.log(`    Date range: ${dateStart} to ${dateEnd} (${daysBack} days)`);

    try {
      // Test if specific video actions exist by requesting them explicitly
      console.log('    🎬 Testing explicit video action requests...');
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/act_${account.meta_account_id}/insights`,
        {
          params: {
            access_token: account.access_token,
            level: 'ad',
            fields: 'ad_id,campaign_id,adset_id,impressions,clicks,spend,reach,frequency,actions,action_values,purchase_roas,ctr,cpc,cpm,inline_link_clicks,outbound_clicks',
            action_attribution_windows: ['1d_view', '7d_click'],
            time_range: JSON.stringify({
              since: dateStart,
              until: dateEnd
            }),
            time_increment: 1,
            limit: 1000
          }
        }
      );

      const insights = insightsResponse.data.data || [];
      console.log(`    Found ${insights.length} ad-level insights`);

      // Debug: Log raw insight data for the first video ad to see what Meta API actually returns
      const debugInsight = insights.find(insight => {
        // Look for insights that should have video data
        return insight.impressions > 1000;
      });
      
      if (debugInsight) {
        console.log('    🔍 DEBUG: Raw Meta API insight data sample:');
        console.log('    Available fields:', Object.keys(debugInsight));
        console.log('    Video fields:');
        Object.keys(debugInsight).filter(key => key.includes('video')).forEach(field => {
          console.log(`      ${field}: ${JSON.stringify(debugInsight[field])} (type: ${typeof debugInsight[field]})`);
        });
        console.log('    Other key fields:');
        ['impressions', 'clicks', 'spend', 'ad_id'].forEach(field => {
          if (debugInsight[field] !== undefined) {
            console.log(`      ${field}: ${debugInsight[field]}`);
          }
        });
        
        // Check if video metrics are in the actions array
        if (debugInsight.actions && Array.isArray(debugInsight.actions)) {
          console.log('    Actions array content:');
          debugInsight.actions.forEach(action => {
            if (action.action_type && action.action_type.includes('video')) {
              console.log(`      VIDEO ACTION: ${action.action_type} = ${action.value}`);
            }
          });
          
          // Show all action types to see what's available
          console.log('    All action types:', debugInsight.actions.map(a => a.action_type).join(', '));
        }
        console.log('    =====================================');
      }

      for (const insight of insights) {
        await this.processAdLevelInsightRecord(account, insight);
      }
    } catch (error) {
      console.warn(`    ⚠️  Could not sync ad insights: ${error.message}`);
    }
  }

  async ensureAggregatedStructure(account, campaignId, adSetId, adId) {
    // Create aggregated campaign
    await this.supabase
      .from('campaigns')
      .upsert({
        id: campaignId,
        account_id: account.meta_account_id,
        name: `${account.client_name} - Aggregated Data`,
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });

    // Create aggregated ad set
    await this.supabase
      .from('ad_sets')
      .upsert({
        id: adSetId,
        campaign_id: campaignId,
        account_id: account.meta_account_id,
        name: `${account.client_name} - Aggregated AdSet`,
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });

    // Create aggregated ad
    await this.supabase
      .from('ads')
      .upsert({
        id: adId,
        ad_set_id: adSetId,
        campaign_id: campaignId,
        account_id: account.meta_account_id,
        name: `${account.client_name} - Aggregated Ad`,
        status: 'ACTIVE',
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      });
  }

  async processAccountInsightRecord(account, insight) {
    // Parse conversion data
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    if (insight.actions && Array.isArray(insight.actions)) {
      insight.actions.forEach(action => {
        if (['purchase', 'complete_registration', 'lead', 'add_to_cart'].includes(action.action_type)) {
          totalConversions += parseFloat(action.value || 0);
        }
        if (action.action_type === 'purchase') {
          totalPurchases += parseFloat(action.value || 0);
        }
      });
    }

    if (insight.action_values && Array.isArray(insight.action_values)) {
      insight.action_values.forEach(actionValue => {
        if (actionValue.action_type === 'purchase') {
          totalConversionValue += parseFloat(actionValue.value || 0);
          totalPurchaseValue += parseFloat(actionValue.value || 0);
        }
      });
    }

    // Create a synthetic ad_id for account-level data to avoid conflicts
    const accountAdId = `account_${account.meta_account_id}_${insight.date_start}`;
    const accountCampaignId = `account_campaign_${account.meta_account_id}`;
    const accountAdSetId = `account_adset_${account.meta_account_id}`;

    const insightData = {
      date_start: insight.date_start,
      account_id: account.meta_account_id,
      campaign_id: accountCampaignId,
      ad_set_id: accountAdSetId,
      ad_id: accountAdId,
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: parseFloat(insight.spend || '0'),
      reach: parseInt(insight.reach || '0'),
      frequency: parseFloat(insight.frequency || '0'),
      conversions: totalConversions,
      conversion_values: totalConversionValue,
      link_clicks: parseInt(insight.inline_link_clicks || '0'), // Use inline_link_clicks for accuracy
      purchases: totalPurchases,
      purchase_values: totalPurchaseValue,
      ctr: parseFloat(insight.ctr || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      video_views: parseFloat(insight.video_play_actions || '0'),
      video_p25_watched_actions: parseFloat(insight.video_p25_watched_actions || '0'),
      video_p50_watched_actions: parseFloat(insight.video_p50_watched_actions || '0'),
      video_p75_watched_actions: parseFloat(insight.video_p75_watched_actions || '0'),
      video_p100_watched_actions: parseFloat(insight.video_p100_watched_actions || '0')
    };

    // Calculate ROAS if we have conversion value and spend
    if (totalConversionValue > 0 && insightData.spend > 0) {
      insightData.roas = parseFloat((totalConversionValue / insightData.spend).toFixed(4));
    }

    // Ensure we have the aggregated campaign/adset/ad structure
    await this.ensureAggregatedStructure(account, accountCampaignId, accountAdSetId, accountAdId);

    await this.supabase
      .from('daily_ad_insights')
      .upsert(insightData, {
        onConflict: 'ad_id,date_start'
      });
  }

  async processCampaignInsightRecord(account, insight) {
    // Parse conversion data
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    if (insight.actions && Array.isArray(insight.actions)) {
      insight.actions.forEach(action => {
        if (['purchase', 'complete_registration', 'lead', 'add_to_cart'].includes(action.action_type)) {
          totalConversions += parseFloat(action.value || 0);
        }
        if (action.action_type === 'purchase') {
          totalPurchases += parseFloat(action.value || 0);
        }
      });
    }

    if (insight.action_values && Array.isArray(insight.action_values)) {
      insight.action_values.forEach(actionValue => {
        if (actionValue.action_type === 'purchase') {
          totalConversionValue += parseFloat(actionValue.value || 0);
          totalPurchaseValue += parseFloat(actionValue.value || 0);
        }
      });
    }

    // For campaign insights, we need to aggregate across all ad sets in the campaign
    // But first, let's store individual campaign daily insights
    const campaignInsightId = `${insight.campaign_id}_${insight.date_start}`;
    
    const insightData = {
      date_start: insight.date_start,
      account_id: account.meta_account_id,
      campaign_id: insight.campaign_id,
      ad_set_id: `campaign_agg_${insight.campaign_id}`, // Synthetic ad set ID for campaign aggregation
      ad_id: campaignInsightId, // Use campaign + date as unique ad_id
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: parseFloat(insight.spend || '0'),
      reach: parseInt(insight.reach || '0'),
      frequency: parseFloat(insight.frequency || '0'),
      conversions: totalConversions,
      conversion_values: totalConversionValue,
      link_clicks: parseInt(insight.inline_link_clicks || '0'),
      purchases: totalPurchases,
      purchase_values: totalPurchaseValue,
      ctr: parseFloat(insight.ctr || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      video_views: parseFloat(insight.video_play_actions || '0'),
      video_p25_watched_actions: parseFloat(insight.video_p25_watched_actions || '0'),
      video_p50_watched_actions: parseFloat(insight.video_p50_watched_actions || '0'),
      video_p75_watched_actions: parseFloat(insight.video_p75_watched_actions || '0'),
      video_p100_watched_actions: parseFloat(insight.video_p100_watched_actions || '0')
    };

    // Calculate ROAS if we have conversion value and spend
    if (totalConversionValue > 0 && insightData.spend > 0) {
      insightData.roas = parseFloat((totalConversionValue / insightData.spend).toFixed(4));
    }

    await this.supabase
      .from('daily_ad_insights')
      .upsert(insightData, {
        onConflict: 'ad_id,date_start'
      });
  }

  async processAdLevelInsightRecord(account, insight) {
    // Parse conversion data
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    if (insight.actions && Array.isArray(insight.actions)) {
      insight.actions.forEach(action => {
        if (['purchase', 'complete_registration', 'lead', 'add_to_cart'].includes(action.action_type)) {
          totalConversions += parseFloat(action.value || 0);
        }
        if (action.action_type === 'purchase') {
          totalPurchases += parseFloat(action.value || 0);
        }
      });
    }

    if (insight.action_values && Array.isArray(insight.action_values)) {
      insight.action_values.forEach(actionValue => {
        if (actionValue.action_type === 'purchase') {
          totalConversionValue += parseFloat(actionValue.value || 0);
          totalPurchaseValue += parseFloat(actionValue.value || 0);
        }
      });
    }

    const insightData = {
      date_start: insight.date_start,
      account_id: account.meta_account_id,
      campaign_id: insight.campaign_id,
      ad_set_id: insight.adset_id,
      ad_id: insight.ad_id,
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: parseFloat(insight.spend || '0'),
      reach: parseInt(insight.reach || '0'),
      frequency: parseFloat(insight.frequency || '0'),
      conversions: totalConversions,
      conversion_values: totalConversionValue,
      link_clicks: parseInt(insight.inline_link_clicks || '0'),
      purchases: totalPurchases,
      purchase_values: totalPurchaseValue,
      ctr: parseFloat(insight.ctr || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      video_views: parseFloat(insight.video_play_actions || '0'),
      video_p25_watched_actions: parseFloat(insight.video_p25_watched_actions || '0'),
      video_p50_watched_actions: parseFloat(insight.video_p50_watched_actions || '0'),
      video_p75_watched_actions: parseFloat(insight.video_p75_watched_actions || '0'),
      video_p100_watched_actions: parseFloat(insight.video_p100_watched_actions || '0')
    };

    // Calculate ROAS if we have conversion value and spend
    if (totalConversionValue > 0 && insightData.spend > 0) {
      insightData.roas = parseFloat((totalConversionValue / insightData.spend).toFixed(4));
    }

    await this.supabase
      .from('daily_ad_insights')
      .upsert(insightData, {
        onConflict: 'ad_id,date_start'
      });

    // Also sync to video_ad_insights if this has video metrics
    await this.syncVideoInsights(account, insight, insightData);
  }

  async syncVideoInsights(account, originalInsight, processedData) {
    // Check if this ad has video engagement data from actions array
    let hasVideoViews = false;
    if (originalInsight.actions && Array.isArray(originalInsight.actions)) {
      hasVideoViews = originalInsight.actions.some(action => 
        ['video_view', 'video_play'].includes(action.action_type)
      );
    }

    const hasVideoMetrics = 
      hasVideoViews ||
      processedData.video_views > 0 || 
      processedData.video_p25_watched_actions > 0 ||
      processedData.video_p50_watched_actions > 0;

    if (!hasVideoMetrics) {
      console.log(`  📽️  No video metrics found for ad ${processedData.ad_id}, skipping video insights`);
      return; // Skip non-video ads
    }

    console.log(`  🎬 Syncing video insights for ad ${processedData.ad_id}`);
    
    // Extract video plays from actions array
    let videoPlays = 0;
    if (originalInsight.actions && Array.isArray(originalInsight.actions)) {
      originalInsight.actions.forEach(action => {
        if (['video_view', 'video_play'].includes(action.action_type)) {
          videoPlays += parseFloat(action.value || 0);
        }
      });
    }

    // Extract video-specific fields from the Meta API response
    const videoThruplayWatchedActions = this.parseVideoMetric(originalInsight.video_thruplay_watched_actions);
    const video15SecWatchedActions = this.parseVideoMetric(originalInsight.video_15_sec_watched_actions);
    const video30SecWatchedActions = this.parseVideoMetric(originalInsight.video_30_sec_watched_actions);
    const videoAvgTimeWatchedActions = this.parseVideoMetric(originalInsight.video_avg_time_watched_actions);

    const videoInsightData = {
      date_start: processedData.date_start,
      account_id: processedData.account_id,
      campaign_id: processedData.campaign_id,
      ad_set_id: processedData.ad_set_id,
      ad_id: processedData.ad_id,
      
      // Core metrics from processed data
      impressions: processedData.impressions,
      spend: processedData.spend,
      
      // Video identification (to be filled by a separate service if needed)
      creative_id: null,
      video_title: null,
      video_duration_seconds: null,
      thumbnail_url: null,
      
      // Video view metrics
      video_plays: videoPlays || processedData.video_views,
      video_thruplay_watched_actions: videoThruplayWatchedActions,
      video_p25_watched_actions: processedData.video_p25_watched_actions,
      video_p50_watched_actions: processedData.video_p50_watched_actions,
      video_p75_watched_actions: processedData.video_p75_watched_actions,
      video_p95_watched_actions: processedData.video_p100_watched_actions, // Use p100 as p95 if p95 not available
      video_p100_watched_actions: processedData.video_p100_watched_actions,
      video_15_sec_watched_actions: video15SecWatchedActions,
      video_30_sec_watched_actions: video30SecWatchedActions,
      video_avg_time_watched_actions: videoAvgTimeWatchedActions,
      
      // Engagement metrics
      clicks: processedData.clicks,
      link_clicks: processedData.link_clicks,
      conversions: processedData.conversions,
      conversion_values: processedData.conversion_values,
      
      // Performance scoring (will be calculated by GENERATED columns)
      hook_score: null,
      retention_score: null,
      engagement_score: null
    };

    try {
      await this.supabase
        .from('video_ad_insights')
        .upsert(videoInsightData, {
          onConflict: 'ad_id,date_start'
        });
    } catch (error) {
      console.warn(`⚠️  Failed to sync video insights for ad ${processedData.ad_id}:`, error.message);
    }
  }

  parseVideoMetric(metricValue) {
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

  async processAdInsightRecord(account, insight) {
    // Legacy method - now calls the account-level processor for compatibility
    await this.processAccountInsightRecord(account, insight);
  }

  async processInsightRecord(account, insight, structure) {
    // Legacy method - keeping for compatibility
    await this.processAdInsightRecord(account, insight);
  }

  async updateComputedMetrics(account) {
    console.log(`  🧮 Updating computed metrics for ${account.client_name}`);
    
    try {
      // Try using database function first
      const { error: rpcError } = await this.supabase.rpc('update_computed_metrics', {
        target_account_id: account.meta_account_id
      });

      if (rpcError) {
        // Fallback: Update metrics manually
        console.log(`    📝 Using manual metric calculation`);
        await this.manuallyUpdateMetrics(account.meta_account_id);
      } else {
        console.log(`    ✅ Updated computed metrics via database function`);
      }
    } catch (error) {
      // Fallback: Update metrics manually
      console.log(`    📝 Using manual metric calculation`);
      await this.manuallyUpdateMetrics(account.meta_account_id);
    }
  }

  async manuallyUpdateMetrics(accountId) {
    // Get records that need metric updates
    const { data: records, error } = await this.supabase
      .from('daily_ad_insights')
      .select('id, impressions, clicks, spend, conversion_values, ctr, cpc, cpm, roas')
      .eq('account_id', accountId)
      .gte('date_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      console.warn(`    ⚠️  Could not fetch records for metric update: ${error.message}`);
      return;
    }

    let updatedCount = 0;
    
    for (const record of records || []) {
      const updates = {};
      let needsUpdate = false;

      // Calculate CTR if missing and we have data
      if ((!record.ctr || record.ctr === 0) && record.impressions > 0 && record.clicks > 0) {
        updates.ctr = parseFloat(((record.clicks / record.impressions) * 100).toFixed(4));
        needsUpdate = true;
      }

      // Calculate CPC if missing and we have data
      if ((!record.cpc || record.cpc === 0) && record.clicks > 0 && record.spend > 0) {
        updates.cpc = parseFloat((record.spend / record.clicks).toFixed(4));
        needsUpdate = true;
      }

      // Calculate CPM if missing and we have data
      if ((!record.cpm || record.cpm === 0) && record.impressions > 0 && record.spend > 0) {
        updates.cpm = parseFloat(((record.spend / record.impressions) * 1000).toFixed(4));
        needsUpdate = true;
      }

      // Calculate ROAS if missing and we have data
      if ((!record.roas || record.roas === 0) && record.spend > 0 && record.conversion_values > 0) {
        updates.roas = parseFloat((record.conversion_values / record.spend).toFixed(4));
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.supabase
          .from('daily_ad_insights')
          .update(updates)
          .eq('id', record.id);
        updatedCount++;
      }
    }

    console.log(`    ✅ Updated ${updatedCount} records with computed metrics`);
  }

  async syncAllAccounts(daysBack = 3) {
    console.log('🚀 Starting standardized ETL sync for all active accounts\n');
    
    try {
      const accounts = await this.getActiveAccounts();
      console.log(`Found ${accounts.length} active accounts to sync`);

      for (const account of accounts) {
        await this.syncAccount(account, daysBack);
        
        // Wait between accounts to respect rate limits
        console.log('⏳ Waiting 3 seconds before next account...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log('🎉 Standardized ETL sync completed for all accounts');
      
      // Generate summary report
      await this.generateSyncReport();

    } catch (error) {
      console.error('💥 ETL sync failed:', error.message);
      throw error;
    }
  }

  async generateSyncReport() {
    console.log('\n📋 SYNC SUMMARY REPORT');
    console.log('=' .repeat(50));

    const accounts = await this.getActiveAccounts();
    
    for (const account of accounts) {
      const { data } = await this.supabase
        .from('daily_ad_insights')
        .select('spend, conversions, conversion_values, roas')
        .eq('account_id', account.meta_account_id)
        .gte('date_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (data && data.length > 0) {
        const totalSpend = data.reduce((sum, row) => sum + (row.spend || 0), 0);
        const totalConversions = data.reduce((sum, row) => sum + (row.conversions || 0), 0);
        const totalConversionValue = data.reduce((sum, row) => sum + (row.conversion_values || 0), 0);
        const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

        console.log(`\n${account.client_name}:`);
        console.log(`  Last 7 days: ${data.length} records`);
        console.log(`  Total Spend: $${totalSpend.toFixed(2)}`);
        console.log(`  Conversions: ${totalConversions.toFixed(0)}`);
        console.log(`  Revenue: $${totalConversionValue.toFixed(2)}`);
        console.log(`  ROAS: ${avgROAS.toFixed(2)}`);
        console.log(`  Status: ${account.sync_status}`);
      } else {
        console.log(`\n${account.client_name}: No recent data found`);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
  }
}

module.exports = { StandardizedETLService };