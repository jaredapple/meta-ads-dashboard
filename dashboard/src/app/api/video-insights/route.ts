import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface VideoMetrics {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  impressions: number;
  spend: number;
  videoThruplayWatchedActions: number;
  video15SecWatchedActions: number;
  thumbstopRate: number;
  holdRate15s: number;
  completionRate: number;
  roas: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const campaignId = searchParams.get('campaignId');
    const minImpressions = parseInt(searchParams.get('minImpressions') || '1000');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query real video data from daily_ad_insights with video metrics
    let query = supabase
      .from('daily_ad_insights')
      .select(`
        ad_id,
        campaign_id,
        impressions,
        spend,
        video_views,
        video_thruplay_watched_actions,
        video_15_sec_watched_actions,
        video_30_sec_watched_actions,
        video_p25_watched_actions,
        video_p50_watched_actions,
        video_p75_watched_actions,
        video_p95_watched_actions,
        video_p100_watched_actions,
        video_avg_time_watched_actions,
        conversions,
        conversion_values,
        ads!inner(name),
        campaigns!inner(name)
      `)
      .gte('date_start', startDate.toISOString().split('T')[0])
      .lte('date_start', endDate.toISOString().split('T')[0]);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate data by ad
    const adMetricsMap = new Map<string, any>();

    data?.forEach((row: any) => {
      const adId = row.ad_id;
      
      if (!adMetricsMap.has(adId)) {
        adMetricsMap.set(adId, {
          adId,
          adName: row.ads?.name || 'Unknown Ad',
          campaignId: row.campaign_id,
          campaignName: row.campaigns?.name || 'Unknown Campaign',
          impressions: 0,
          spend: 0,
          videoViews: 0,
          videoThruplayWatchedActions: 0,
          video15SecWatchedActions: 0,
          video30SecWatchedActions: 0,
          videoP25WatchedActions: 0,
          videoP50WatchedActions: 0,
          videoP75WatchedActions: 0,
          videoP95WatchedActions: 0,
          videoP100WatchedActions: 0,
          videoAvgTimeWatchedActions: 0,
          conversions: 0,
          conversionValues: 0
        });
      }

      const metrics = adMetricsMap.get(adId);
      metrics.impressions += row.impressions || 0;
      metrics.spend += parseFloat(row.spend || 0);
      metrics.videoViews += row.video_views || 0;
      // Use real video metrics from Meta API
      metrics.videoThruplayWatchedActions += row.video_thruplay_watched_actions || 0;
      metrics.video15SecWatchedActions += row.video_15_sec_watched_actions || 0;
      metrics.video30SecWatchedActions += row.video_30_sec_watched_actions || 0;
      metrics.videoP25WatchedActions += row.video_p25_watched_actions || 0;
      metrics.videoP50WatchedActions += row.video_p50_watched_actions || 0;
      metrics.videoP75WatchedActions += row.video_p75_watched_actions || 0;
      metrics.videoP95WatchedActions += row.video_p95_watched_actions || 0;
      metrics.videoP100WatchedActions += row.video_p100_watched_actions || 0;
      metrics.videoAvgTimeWatchedActions += parseFloat(row.video_avg_time_watched_actions || 0);
      metrics.conversions += parseFloat(row.conversions || 0);
      metrics.conversionValues += parseFloat(row.conversion_values || 0);
    });

    // Calculate rates and filter by minimum impressions
    const videoMetrics: VideoMetrics[] = Array.from(adMetricsMap.values())
      .filter(m => m.impressions >= minImpressions)
      .map(m => ({
        adId: m.adId,
        adName: m.adName,
        campaignId: m.campaignId,
        campaignName: m.campaignName,
        impressions: m.impressions,
        spend: m.spend,
        videoThruplayWatchedActions: m.videoThruplayWatchedActions,
        video15SecWatchedActions: m.video15SecWatchedActions,
        thumbstopRate: m.impressions > 0 ? (m.videoThruplayWatchedActions / m.impressions) * 100 : 0,
        holdRate15s: m.impressions > 0 ? (m.video15SecWatchedActions / m.impressions) * 100 : 0,
        completionRate: m.impressions > 0 ? (m.videoP100WatchedActions / m.impressions) * 100 : 0,
        roas: m.spend > 0 ? m.conversionValues / m.spend : 0
      }))
      .sort((a, b) => b.spend - a.spend);

    // Calculate summary statistics
    const totalImpressions = videoMetrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalThumbstops = videoMetrics.reduce((sum, m) => sum + m.videoThruplayWatchedActions, 0);
    const total15SecViews = videoMetrics.reduce((sum, m) => sum + m.video15SecWatchedActions, 0);
    const totalSpend = videoMetrics.reduce((sum, m) => sum + m.spend, 0);

    const summary = {
      totalAds: videoMetrics.length,
      avgThumbstopRate: totalImpressions > 0 ? (totalThumbstops / totalImpressions) * 100 : 0,
      avgHoldRate15s: totalImpressions > 0 ? (total15SecViews / totalImpressions) * 100 : 0,
      totalSpend,
      totalImpressions,
      topPerformerByHook: videoMetrics.reduce((best, current) => 
        current.thumbstopRate > (best?.thumbstopRate || 0) ? current : best, 
        videoMetrics[0]
      ),
      topPerformerByRetention: videoMetrics.reduce((best, current) => 
        current.holdRate15s > (best?.holdRate15s || 0) ? current : best, 
        videoMetrics[0]
      )
    };

    return NextResponse.json({
      summary,
      videos: videoMetrics.slice(0, 20), // Return top 20 videos
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days
      }
    });
  } catch (error) {
    console.error('Error fetching video insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video insights' },
      { status: 500 }
    );
  }
}