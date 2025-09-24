import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Industry benchmarks
const BENCHMARKS = {
  thumbstopRate: { poor: 10.0, fair: 15.0, good: 20.0, excellent: 26.0 },
  holdRate15s: { poor: 3.0, fair: 4.5, good: 6.0, excellent: 9.0 },
  completionRate: { poor: 5.0, fair: 10.0, good: 15.0, excellent: 25.0 }
};

interface Recommendation {
  adId: string;
  adName: string;
  campaignName: string;
  type: 'scale_up' | 'improve_hook' | 'improve_retention' | 'pause' | 'refresh_creative';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentMetrics: {
    thumbstopRate: number;
    holdRate: number;
    completionRate: number;
    spend: number;
    roas: number;
    cvr: number;
  };
  potentialImpact?: {
    estimatedReachIncrease?: number;
    estimatedConversionIncrease?: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '10');
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId parameter is required' },
        { status: 400 }
      );
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch video performance data from new video_metrics table
    const { data, error } = await supabase
      .from('video_metrics')
      .select(`
        ad_id,
        ad_name,
        campaign_id,
        campaign_name,
        date_start,
        impressions,
        spend,
        video_3sec_views,
        video_15sec_views,
        video_p100_watched,
        thumbstop_rate,
        hold_rate,
        completion_rate,
        conversions,
        conversion_values,
        roas
      `)
      .eq('account_id', accountId)
      .gte('date_start', startDate.toISOString().split('T')[0])
      .lte('date_start', endDate.toISOString().split('T')[0])
      .gte('impressions', 1000);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate metrics by ad since video_metrics has daily records
    const adPerformanceMap = new Map<string, any>();

    data?.forEach((row: any) => {
      const adId = row.ad_id;
      
      if (!adPerformanceMap.has(adId)) {
        adPerformanceMap.set(adId, {
          adId,
          adName: row.ad_name,
          campaignName: row.campaign_name,
          totalImpressions: 0,
          totalSpend: 0,
          totalThumbstopRate: 0,
          totalHoldRate: 0,
          totalCompletionRate: 0,
          totalConversions: 0,
          totalConversionValues: 0,
          recordCount: 0,
          lastDate: row.date_start
        });
      }

      const perf = adPerformanceMap.get(adId);
      perf.totalImpressions += row.impressions || 0;
      perf.totalSpend += parseFloat(row.spend || 0);
      perf.totalThumbstopRate += row.thumbstop_rate || 0;
      perf.totalHoldRate += row.hold_rate || 0;
      perf.totalCompletionRate += row.completion_rate || 0;
      perf.totalConversions += parseFloat(row.conversions || 0);
      perf.totalConversionValues += parseFloat(row.conversion_values || 0);
      perf.recordCount += 1;
      if (row.date_start > perf.lastDate) {
        perf.lastDate = row.date_start;
      }
    });

    // Generate recommendations for each video ad
    const recommendations: Recommendation[] = [];

    adPerformanceMap.forEach((perf) => {
      // Skip static ads from video recommendations  
      if (perf.adName.toLowerCase().includes('static')) {
        return; // Skip this ad as it's not a video ad
      }
      
      // Calculate average rates from daily data
      const thumbstopRate = perf.recordCount > 0 ? perf.totalThumbstopRate / perf.recordCount : 0;
      const holdRate = perf.recordCount > 0 ? perf.totalHoldRate / perf.recordCount : 0;
      const completionRate = perf.recordCount > 0 ? perf.totalCompletionRate / perf.recordCount : 0;
      const roas = perf.totalSpend > 0 ? perf.totalConversionValues / perf.totalSpend : 0;
      const cvr = perf.totalImpressions > 0 ? (perf.totalConversions / perf.totalImpressions) * 100 : 0;
      
      // Debug logging for verification
      if (perf.adName.includes("Sarah")) {
        console.log("\n=== Video metrics for", perf.adName, "===");
        console.log("  Record count:", perf.recordCount);
        console.log("  Total Impressions:", perf.totalImpressions);
        console.log("  Thumbstop Rate:", thumbstopRate.toFixed(2) + "%");
        console.log("  Hold Rate:", holdRate.toFixed(2) + "%");
        console.log("  Completion Rate:", completionRate.toFixed(2) + "%");
        console.log("  ROAS:", roas.toFixed(2) + "x");
        console.log("=====================================\n");
      }

      const currentMetrics = {
        thumbstopRate: Math.round(thumbstopRate * 100) / 100,
        holdRate: Math.round(holdRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        spend: Math.round(perf.totalSpend * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        cvr: Math.round(cvr * 100) / 100
      };

      // 1. Scale up high performers based on video metrics
      if (thumbstopRate >= BENCHMARKS.thumbstopRate.excellent && // Excellent thumbstop rate (≥26%)
          holdRate >= BENCHMARKS.holdRate15s.good) { // Good hold rate (≥6%)
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'scale_up',
          priority: 'high',
          title: '🚀 High-Performing Video Creative - Scale Up',
          description: `Excellent video performance: ${currentMetrics.thumbstopRate.toFixed(2)}% thumbstop rate and ${currentMetrics.holdRate.toFixed(2)}% hold rate with ${currentMetrics.roas}x ROAS. Currently underspending at $${currentMetrics.spend}. This creative is highly engaging.`,
          currentMetrics,
          potentialImpact: {
            estimatedReachIncrease: 40,
            estimatedConversionIncrease: 35
          }
        });
      }

      // 1b. High video engagement - scale opportunity
      else if (thumbstopRate >= BENCHMARKS.thumbstopRate.good && // High thumbstop rate (≥20%)
               perf.totalSpend > 100) { // Has some spend
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'scale_up',
          priority: 'medium',
          title: '🌟 Good Engagement Creative - Scale Opportunity', 
          description: `Good video engagement (${currentMetrics.thumbstopRate.toFixed(2)}% thumbstop rate) with ${currentMetrics.holdRate.toFixed(2)}% hold rate. Spent $${currentMetrics.spend} with strong performance indicators.`,
          currentMetrics,
          potentialImpact: {
            estimatedReachIncrease: 25,
            estimatedConversionIncrease: 50
          }
        });
      }

      // 2. Improve low video engagement creatives
      if (thumbstopRate < BENCHMARKS.thumbstopRate.poor && // Low thumbstop rate (<10%)
          perf.totalImpressions > 5000 && // Significant exposure
          perf.totalSpend > 100) { // Meaningful spend
          
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'improve_hook',
          priority: perf.totalSpend > 500 ? 'high' : 'medium',
          title: '⚠️ Low Engagement Creative - Refresh Hook',
          description: `Poor thumbstop rate (${currentMetrics.thumbstopRate.toFixed(2)}%) despite significant reach. This video hook isn't resonating with your audience. Consider testing new opening angles or stronger visual hooks.`,
          currentMetrics,
          potentialImpact: {
            estimatedReachIncrease: 60
          }
        });
      }

      // 3. Fix retention issues (good hook, poor retention)
      if (thumbstopRate >= BENCHMARKS.thumbstopRate.fair && // Decent thumbstop rate
          holdRate < BENCHMARKS.holdRate15s.poor && // Poor hold rate
          perf.totalImpressions > 5000) { // Meaningful exposure
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'improve_retention',
          priority: 'high',
          title: '⏱️ Good Hook, Poor Retention',
          description: `Good initial engagement (${currentMetrics.thumbstopRate.toFixed(2)}% thumbstop) but poor retention (${currentMetrics.holdRate.toFixed(2)}% hold rate). Video content after the hook may not be compelling enough.`,
          currentMetrics,
          potentialImpact: {
            estimatedConversionIncrease: 40
          }
        });
      }

      // 4. Pause underperformers
      if (perf.totalSpend > 200 && // Significant spend
          roas < 0.8 && // Poor ROAS
          thumbstopRate < BENCHMARKS.thumbstopRate.poor) { // Very low thumbstop rate
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'pause',
          priority: 'high',
          title: '🛑 Poor Performance - Consider Pausing',
          description: `Poor performance with ${currentMetrics.roas}x ROAS and ${currentMetrics.thumbstopRate.toFixed(2)}% thumbstop rate. Spent $${currentMetrics.spend} with minimal video engagement.`,
          currentMetrics
        });
      }

      // 5. Detect potential creative fatigue (if running for many days)
      if (perf.recordCount >= 14) {
        recommendations.push({
          adId: perf.adId,
          adName: perf.adName,
          campaignName: perf.campaignName,
          type: 'refresh_creative',
          priority: 'low',
          title: '🔄 Long-Running Creative',
          description: `This creative has been running for ${perf.recordCount} days. Consider testing fresh creative angles to prevent audience fatigue.`,
          currentMetrics,
          potentialImpact: {
            estimatedReachIncrease: 20,
            estimatedConversionIncrease: 15
          }
        });
      }
    });

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      const aScore = priorityScore[a.priority] + 
        (a.potentialImpact?.estimatedReachIncrease || 0) / 10 +
        (a.potentialImpact?.estimatedConversionIncrease || 0) / 10;
      const bScore = priorityScore[b.priority] + 
        (b.potentialImpact?.estimatedReachIncrease || 0) / 10 +
        (b.potentialImpact?.estimatedConversionIncrease || 0) / 10;
      return bScore - aScore;
    });

    // Calculate summary insights
    const averageCVR = recommendations.length > 0 ? 
      recommendations.reduce((sum, r) => sum + r.currentMetrics.cvr, 0) / recommendations.length : 0;
    const highCVRAds = recommendations.filter(r => r.currentMetrics.cvr > 3).length; // CVR > 3% is considered good
    
    const summary = {
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      scalingOpportunities: recommendations.filter(r => r.type === 'scale_up').length,
      creativesNeedingRefresh: recommendations.filter(r => 
        r.type === 'improve_hook' || r.type === 'improve_retention' || r.type === 'refresh_creative'
      ).length,
      averageCVR: Math.round(averageCVR * 100) / 100,
      highCVRAds
    };

    return NextResponse.json({
      summary,
      recommendations: recommendations.slice(0, limit),
      benchmarks: BENCHMARKS,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days
      }
    });
  } catch (error) {
    console.error('Error generating video recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate video recommendations' },
      { status: 500 }
    );
  }
}