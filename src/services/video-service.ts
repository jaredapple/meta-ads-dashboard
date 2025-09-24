import { DatabaseClient } from '../database/client';
import { logger } from '../utils/logger';

export interface VideoInsight {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  dateStart: string;
  impressions: number;
  spend: number;
  videoPlays: number;
  videoThruplayWatchedActions: number; // 3-second views
  video15SecWatchedActions: number;
  video30SecWatchedActions: number;
  videoP25WatchedActions: number;
  videoP50WatchedActions: number;
  videoP75WatchedActions: number;
  videoP95WatchedActions: number;
  videoP100WatchedActions: number;
  videoAvgTimeWatchedActions: number;
  clicks: number;
  linkClicks: number;
  conversions: number;
  conversionValues: number;
  thumbstopRate?: number;
  holdRate15s?: number;
  completionRate?: number;
  avgWatchPercentage?: number;
  costPerThumbstop?: number;
}

export interface VideoRecommendation {
  adId: string;
  adName: string;
  type: 'scale_up' | 'improve_hook' | 'improve_retention' | 'pause' | 'refresh_creative';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  currentMetrics: {
    thumbstopRate: number;
    holdRate: number;
    completionRate: number;
    spend: number;
    roas: number;
  };
  benchmarkComparison: {
    thumbstopVsBenchmark: number; // percentage difference
    holdRateVsBenchmark: number;
    completionVsBenchmark: number;
  };
  potentialImpact: {
    estimatedReachIncrease?: number;
    estimatedCostSavings?: number;
    estimatedConversionIncrease?: number;
  };
}

export class VideoService {
  private db: DatabaseClient;

  // Industry benchmarks for video metrics
  private readonly BENCHMARKS = {
    thumbstopRate: {
      poor: 10.0,
      fair: 15.0,
      good: 20.0,
      excellent: 26.0
    },
    holdRate15s: {
      poor: 3.0,
      fair: 4.5,
      good: 6.0,
      excellent: 9.0
    },
    completionRate: {
      poor: 5.0,
      fair: 10.0,
      good: 15.0,
      excellent: 25.0
    },
    avgWatchPercentage: {
      poor: 20.0,
      fair: 35.0,
      good: 50.0,
      excellent: 70.0
    }
  };

  constructor() {
    this.db = DatabaseClient.getInstance();
  }

  async getVideoInsights(params: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    minImpressions?: number;
  }): Promise<VideoInsight[]> {
    try {
      const minImpressions = params.minImpressions || 1000;

      const query = `
        SELECT 
          vai.ad_id,
          a.name as ad_name,
          vai.campaign_id,
          c.name as campaign_name,
          vai.date_start,
          SUM(vai.impressions) as impressions,
          SUM(vai.spend) as spend,
          SUM(vai.video_plays) as video_plays,
          SUM(vai.video_thruplay_watched_actions) as video_thruplay_watched_actions,
          SUM(vai.video_15_sec_watched_actions) as video_15_sec_watched_actions,
          SUM(vai.video_30_sec_watched_actions) as video_30_sec_watched_actions,
          SUM(vai.video_p25_watched_actions) as video_p25_watched_actions,
          SUM(vai.video_p50_watched_actions) as video_p50_watched_actions,
          SUM(vai.video_p75_watched_actions) as video_p75_watched_actions,
          SUM(vai.video_p95_watched_actions) as video_p95_watched_actions,
          SUM(vai.video_p100_watched_actions) as video_p100_watched_actions,
          AVG(vai.video_avg_time_watched_actions) as video_avg_time_watched_actions,
          SUM(vai.clicks) as clicks,
          SUM(vai.link_clicks) as link_clicks,
          SUM(vai.conversions) as conversions,
          SUM(vai.conversion_values) as conversion_values,
          AVG(vai.thumbstop_rate) as thumbstop_rate,
          AVG(vai.hold_rate_15s) as hold_rate_15s,
          AVG(vai.completion_rate) as completion_rate,
          AVG(vai.avg_watch_percentage) as avg_watch_percentage,
          AVG(vai.cost_per_thumbstop) as cost_per_thumbstop
        FROM video_ad_insights vai
        JOIN ads a ON vai.ad_id = a.id
        JOIN campaigns c ON vai.campaign_id = c.id
        WHERE vai.date_start >= $1 
          AND vai.date_start <= $2
          ${params.accountId ? 'AND vai.account_id = $3' : ''}
          ${params.campaignId ? `AND vai.campaign_id = $${params.accountId ? 4 : 3}` : ''}
        GROUP BY vai.ad_id, a.name, vai.campaign_id, c.name, vai.date_start
        HAVING SUM(vai.impressions) >= ${minImpressions}
        ORDER BY vai.date_start DESC, SUM(vai.spend) DESC
      `;

      const queryParams = [params.dateStart, params.dateEnd];
      if (params.accountId) queryParams.push(params.accountId);
      if (params.campaignId) queryParams.push(params.campaignId);

      const result = await this.db.query(query, queryParams);

      return result.rows.map(row => ({
        adId: row.ad_id,
        adName: row.ad_name,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        dateStart: row.date_start,
        impressions: parseInt(row.impressions),
        spend: parseFloat(row.spend),
        videoPlays: parseInt(row.video_plays || 0),
        videoThruplayWatchedActions: parseInt(row.video_thruplay_watched_actions || 0),
        video15SecWatchedActions: parseInt(row.video_15_sec_watched_actions || 0),
        video30SecWatchedActions: parseInt(row.video_30_sec_watched_actions || 0),
        videoP25WatchedActions: parseInt(row.video_p25_watched_actions || 0),
        videoP50WatchedActions: parseInt(row.video_p50_watched_actions || 0),
        videoP75WatchedActions: parseInt(row.video_p75_watched_actions || 0),
        videoP95WatchedActions: parseInt(row.video_p95_watched_actions || 0),
        videoP100WatchedActions: parseInt(row.video_p100_watched_actions || 0),
        videoAvgTimeWatchedActions: parseFloat(row.video_avg_time_watched_actions || 0),
        clicks: parseInt(row.clicks || 0),
        linkClicks: parseInt(row.link_clicks || 0),
        conversions: parseFloat(row.conversions || 0),
        conversionValues: parseFloat(row.conversion_values || 0),
        thumbstopRate: parseFloat(row.thumbstop_rate || 0),
        holdRate15s: parseFloat(row.hold_rate_15s || 0),
        completionRate: parseFloat(row.completion_rate || 0),
        avgWatchPercentage: parseFloat(row.avg_watch_percentage || 0),
        costPerThumbstop: parseFloat(row.cost_per_thumbstop || 0),
      }));
    } catch (error) {
      logger.error('Failed to get video insights', error as Error);
      throw error;
    }
  }

  async getVideoRecommendations(params: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    limit?: number;
  }): Promise<VideoRecommendation[]> {
    try {
      const insights = await this.getVideoInsights({
        ...params,
        minImpressions: 1000
      });

      const recommendations: VideoRecommendation[] = [];

      // Aggregate insights by ad
      const adPerformance = new Map<string, any>();
      
      for (const insight of insights) {
        if (!adPerformance.has(insight.adId)) {
          adPerformance.set(insight.adId, {
            adId: insight.adId,
            adName: insight.adName,
            campaignId: insight.campaignId,
            campaignName: insight.campaignName,
            totalImpressions: 0,
            totalSpend: 0,
            totalConversions: 0,
            totalConversionValues: 0,
            thumbstopRates: [],
            holdRates: [],
            completionRates: [],
            dates: []
          });
        }
        
        const perf = adPerformance.get(insight.adId);
        perf.totalImpressions += insight.impressions;
        perf.totalSpend += insight.spend;
        perf.totalConversions += insight.conversions;
        perf.totalConversionValues += insight.conversionValues;
        perf.thumbstopRates.push(insight.thumbstopRate);
        perf.holdRates.push(insight.holdRate15s);
        perf.completionRates.push(insight.completionRate);
        perf.dates.push(insight.dateStart);
      }

      // Generate recommendations for each ad
      for (const [adId, perf] of adPerformance) {
        const avgThumbstop = perf.thumbstopRates.reduce((a: number, b: number) => a + b, 0) / perf.thumbstopRates.length;
        const avgHoldRate = perf.holdRates.reduce((a: number, b: number) => a + b, 0) / perf.holdRates.length;
        const avgCompletion = perf.completionRates.reduce((a: number, b: number) => a + b, 0) / perf.completionRates.length;
        const roas = perf.totalSpend > 0 ? perf.totalConversionValues / perf.totalSpend : 0;

        const currentMetrics = {
          thumbstopRate: avgThumbstop,
          holdRate: avgHoldRate,
          completionRate: avgCompletion,
          spend: perf.totalSpend,
          roas
        };

        // Analyze performance against benchmarks
        const thumbstopVsBenchmark = ((avgThumbstop - this.BENCHMARKS.thumbstopRate.good) / this.BENCHMARKS.thumbstopRate.good) * 100;
        const holdRateVsBenchmark = ((avgHoldRate - this.BENCHMARKS.holdRate15s.good) / this.BENCHMARKS.holdRate15s.good) * 100;
        const completionVsBenchmark = ((avgCompletion - this.BENCHMARKS.completionRate.good) / this.BENCHMARKS.completionRate.good) * 100;

        // Generate recommendations based on performance
        
        // 1. Scale up high performers
        if (avgThumbstop >= this.BENCHMARKS.thumbstopRate.good && 
            avgHoldRate >= this.BENCHMARKS.holdRate15s.good &&
            roas > 2) {
          recommendations.push({
            adId,
            adName: perf.adName,
            type: 'scale_up',
            priority: 'high',
            title: 'Strong Video Performer - Scale Up',
            description: `This video has excellent hook (${avgThumbstop.toFixed(2)}%) and retention (${avgHoldRate.toFixed(2)}%) rates with strong ROAS (${roas.toFixed(2)}x). Consider increasing budget.`,
            actionItems: [
              'Increase daily budget by 20-30%',
              'Duplicate to new audiences',
              'Create similar videos with the same hook style',
              'Test in new placements (Reels, Stories)'
            ],
            currentMetrics,
            benchmarkComparison: {
              thumbstopVsBenchmark,
              holdRateVsBenchmark,
              completionVsBenchmark
            },
            potentialImpact: {
              estimatedReachIncrease: 30,
              estimatedConversionIncrease: 25
            }
          });
        }

        // 2. Improve hook for poor thumbstop rate
        if (avgThumbstop < this.BENCHMARKS.thumbstopRate.fair) {
          recommendations.push({
            adId,
            adName: perf.adName,
            type: 'improve_hook',
            priority: avgHoldRate > this.BENCHMARKS.holdRate15s.fair ? 'high' : 'medium',
            title: 'Weak Hook Performance - Needs Improvement',
            description: `Hook rate (${avgThumbstop.toFixed(2)}%) is below benchmark. ${avgHoldRate > this.BENCHMARKS.holdRate15s.fair ? 'Good retention shows content quality is strong.' : 'Also showing retention issues.'}`,
            actionItems: [
              'Test new thumbnail with clearer value prop',
              'Add text overlay in first 3 seconds',
              'Start with the most compelling moment',
              'Use motion or pattern interrupts in opening',
              'A/B test different opening scenes'
            ],
            currentMetrics,
            benchmarkComparison: {
              thumbstopVsBenchmark,
              holdRateVsBenchmark,
              completionVsBenchmark
            },
            potentialImpact: {
              estimatedReachIncrease: 50,
              estimatedCostSavings: 20
            }
          });
        }

        // 3. Improve retention for poor hold rate
        if (avgHoldRate < this.BENCHMARKS.holdRate15s.fair && avgThumbstop >= this.BENCHMARKS.thumbstopRate.fair) {
          recommendations.push({
            adId,
            adName: perf.adName,
            type: 'improve_retention',
            priority: 'high',
            title: 'Good Hook but Poor Retention',
            description: `Strong hook (${avgThumbstop.toFixed(2)}%) but losing viewers by 15s (${avgHoldRate.toFixed(2)}%). Content may not match hook promise.`,
            actionItems: [
              'Ensure hook promise is delivered quickly',
              'Remove unnecessary intro/branding',
              'Add captions for silent viewing',
              'Increase pacing in 3-15 second range',
              'Consider shorter video format'
            ],
            currentMetrics,
            benchmarkComparison: {
              thumbstopVsBenchmark,
              holdRateVsBenchmark,
              completionVsBenchmark
            },
            potentialImpact: {
              estimatedConversionIncrease: 35
            }
          });
        }

        // 4. Pause underperformers
        if (perf.totalSpend > 100 && roas < 1 && avgThumbstop < this.BENCHMARKS.thumbstopRate.poor) {
          recommendations.push({
            adId,
            adName: perf.adName,
            type: 'pause',
            priority: 'high',
            title: 'Underperforming Video - Consider Pausing',
            description: `Poor performance across metrics with ${roas.toFixed(2)}x ROAS and ${avgThumbstop.toFixed(2)}% hook rate. Spending $${perf.totalSpend.toFixed(2)} inefficiently.`,
            actionItems: [
              'Pause this ad to stop budget drain',
              'Analyze what went wrong for learnings',
              'Reallocate budget to better performers',
              'Consider complete creative refresh'
            ],
            currentMetrics,
            benchmarkComparison: {
              thumbstopVsBenchmark,
              holdRateVsBenchmark,
              completionVsBenchmark
            },
            potentialImpact: {
              estimatedCostSavings: perf.totalSpend * 0.8
            }
          });
        }

        // 5. Refresh creative for declining performance
        const recentThumbstop = perf.thumbstopRates.slice(-3).reduce((a: number, b: number) => a + b, 0) / Math.min(3, perf.thumbstopRates.length);
        const earlyThumbstop = perf.thumbstopRates.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / Math.min(3, perf.thumbstopRates.length);
        
        if (earlyThumbstop > 0 && (recentThumbstop / earlyThumbstop) < 0.7 && perf.dates.length > 7) {
          recommendations.push({
            adId,
            adName: perf.adName,
            type: 'refresh_creative',
            priority: 'medium',
            title: 'Creative Fatigue Detected',
            description: `Hook rate declined ${((1 - recentThumbstop/earlyThumbstop) * 100).toFixed(0)}% over time. Audience may be experiencing ad fatigue.`,
            actionItems: [
              'Create new video with same core message',
              'Test different visual style or format',
              'Rotate in fresh creative variants',
              'Expand to new audiences',
              'Consider seasonal/timely angle'
            ],
            currentMetrics,
            benchmarkComparison: {
              thumbstopVsBenchmark,
              holdRateVsBenchmark,
              completionVsBenchmark
            },
            potentialImpact: {
              estimatedReachIncrease: 40,
              estimatedConversionIncrease: 20
            }
          });
        }
      }

      // Sort by priority and limit
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      return recommendations.slice(0, params.limit || 10);
    } catch (error) {
      logger.error('Failed to generate video recommendations', error as Error);
      throw error;
    }
  }

  async getVideoHookAnalysis(params: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
  }): Promise<any> {
    try {
      const insights = await this.getVideoInsights(params);

      // Group by date for trend analysis
      const dateMap = new Map<string, any>();
      
      for (const insight of insights) {
        if (!dateMap.has(insight.dateStart)) {
          dateMap.set(insight.dateStart, {
            date: insight.dateStart,
            totalImpressions: 0,
            totalThumbstops: 0,
            totalSpend: 0,
            adCount: 0
          });
        }
        
        const dateData = dateMap.get(insight.dateStart);
        dateData.totalImpressions += insight.impressions;
        dateData.totalThumbstops += insight.videoThruplayWatchedActions;
        dateData.totalSpend += insight.spend;
        dateData.adCount += 1;
      }

      const dailyData = Array.from(dateMap.values()).map(d => ({
        date: d.date,
        thumbstopRate: d.totalImpressions > 0 ? (d.totalThumbstops / d.totalImpressions) * 100 : 0,
        totalThumbstops: d.totalThumbstops,
        totalImpressions: d.totalImpressions,
        avgCostPerThumbstop: d.totalThumbstops > 0 ? d.totalSpend / d.totalThumbstops : 0,
        adCount: d.adCount
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate summary metrics
      const totalImpressions = dailyData.reduce((sum, d) => sum + d.totalImpressions, 0);
      const totalThumbstops = dailyData.reduce((sum, d) => sum + d.totalThumbstops, 0);
      const avgThumbstopRate = totalImpressions > 0 ? (totalThumbstops / totalImpressions) * 100 : 0;

      return {
        summary: {
          avgThumbstopRate: Math.round(avgThumbstopRate * 100) / 100,
          totalThumbstops,
          totalImpressions,
          benchmark: this.BENCHMARKS.thumbstopRate.good,
          performance: this.getPerformanceLevel(avgThumbstopRate, 'thumbstopRate')
        },
        dailyTrend: dailyData,
        topPerformers: insights
          .sort((a, b) => b.thumbstopRate - a.thumbstopRate)
          .slice(0, 5)
          .map(i => ({
            adId: i.adId,
            adName: i.adName,
            campaignName: i.campaignName,
            thumbstopRate: Math.round(i.thumbstopRate * 100) / 100,
            impressions: i.impressions
          }))
      };
    } catch (error) {
      logger.error('Failed to get video hook analysis', error as Error);
      throw error;
    }
  }

  async getVideoRetentionFunnel(params: {
    dateStart: string;
    dateEnd: string;
    accountId?: string;
    campaignId?: string;
    adId?: string;
  }): Promise<any> {
    try {
      const insights = await this.getVideoInsights(params);

      // Aggregate funnel data
      let totalImpressions = 0;
      let totalPlays = 0;
      let totalThumbstops = 0;
      let total15Sec = 0;
      let total25Percent = 0;
      let total50Percent = 0;
      let total75Percent = 0;
      let total95Percent = 0;
      let totalCompletions = 0;

      for (const insight of insights) {
        totalImpressions += insight.impressions;
        totalPlays += insight.videoPlays;
        totalThumbstops += insight.videoThruplayWatchedActions;
        total15Sec += insight.video15SecWatchedActions;
        total25Percent += insight.videoP25WatchedActions;
        total50Percent += insight.videoP50WatchedActions;
        total75Percent += insight.videoP75WatchedActions;
        total95Percent += insight.videoP95WatchedActions;
        totalCompletions += insight.videoP100WatchedActions;
      }

      const funnel = [
        {
          stage: 'Impressions',
          count: totalImpressions,
          rate: 100,
          dropoff: 0
        },
        {
          stage: 'Video Starts',
          count: totalPlays,
          rate: totalImpressions > 0 ? (totalPlays / totalImpressions) * 100 : 0,
          dropoff: totalImpressions - totalPlays
        },
        {
          stage: '3 Seconds (Hook)',
          count: totalThumbstops,
          rate: totalImpressions > 0 ? (totalThumbstops / totalImpressions) * 100 : 0,
          dropoff: totalPlays - totalThumbstops
        },
        {
          stage: '15 Seconds',
          count: total15Sec,
          rate: totalImpressions > 0 ? (total15Sec / totalImpressions) * 100 : 0,
          dropoff: totalThumbstops - total15Sec
        },
        {
          stage: '25% Watched',
          count: total25Percent,
          rate: totalImpressions > 0 ? (total25Percent / totalImpressions) * 100 : 0,
          dropoff: total15Sec - total25Percent
        },
        {
          stage: '50% Watched',
          count: total50Percent,
          rate: totalImpressions > 0 ? (total50Percent / totalImpressions) * 100 : 0,
          dropoff: total25Percent - total50Percent
        },
        {
          stage: '75% Watched',
          count: total75Percent,
          rate: totalImpressions > 0 ? (total75Percent / totalImpressions) * 100 : 0,
          dropoff: total50Percent - total75Percent
        },
        {
          stage: '95% Watched',
          count: total95Percent,
          rate: totalImpressions > 0 ? (total95Percent / totalImpressions) * 100 : 0,
          dropoff: total75Percent - total95Percent
        },
        {
          stage: 'Completed',
          count: totalCompletions,
          rate: totalImpressions > 0 ? (totalCompletions / totalImpressions) * 100 : 0,
          dropoff: total95Percent - totalCompletions
        }
      ];

      // Calculate biggest dropoff points
      const dropoffAnalysis = funnel.slice(1).map((stage, index) => ({
        from: funnel[index].stage,
        to: stage.stage,
        dropoffRate: funnel[index].count > 0 ? ((funnel[index].count - stage.count) / funnel[index].count) * 100 : 0,
        absoluteDropoff: funnel[index].count - stage.count
      })).sort((a, b) => b.dropoffRate - a.dropoffRate);

      return {
        funnel: funnel.map(f => ({
          ...f,
          rate: Math.round(f.rate * 100) / 100
        })),
        analysis: {
          biggestDropoff: dropoffAnalysis[0],
          hookStrength: this.getPerformanceLevel(funnel[2].rate, 'thumbstopRate'),
          retentionStrength: this.getPerformanceLevel(funnel[3].rate, 'holdRate15s'),
          completionStrength: this.getPerformanceLevel(funnel[8].rate, 'completionRate')
        },
        benchmarks: {
          thumbstop: this.BENCHMARKS.thumbstopRate.good,
          hold15s: this.BENCHMARKS.holdRate15s.good,
          completion: this.BENCHMARKS.completionRate.good
        }
      };
    } catch (error) {
      logger.error('Failed to get video retention funnel', error as Error);
      throw error;
    }
  }

  private getPerformanceLevel(value: number, metric: keyof typeof VideoService.prototype.BENCHMARKS): string {
    const benchmark = this.BENCHMARKS[metric];
    if (value >= benchmark.excellent) return 'Excellent';
    if (value >= benchmark.good) return 'Good';
    if (value >= benchmark.fair) return 'Fair';
    if (value >= benchmark.poor) return 'Poor';
    return 'Very Poor';
  }
}