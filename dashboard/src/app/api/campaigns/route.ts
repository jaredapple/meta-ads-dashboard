import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get campaign data with aggregated metrics
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        objective,
        status,
        daily_budget,
        lifetime_budget
      `)
      .limit(20)

    if (campaignsError) {
      throw campaignsError
    }

    // Get insights data for the last 7 days to calculate metrics
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateStart = sevenDaysAgo.toISOString().split('T')[0]

    const { data: insights, error: insightsError } = await supabase
      .from('daily_ad_insights')
      .select(`
        campaign_id,
        spend,
        impressions,
        clicks,
        conversions,
        conversion_values,
        ctr,
        cpc,
        roas
      `)
      .gte('date_start', dateStart)

    if (insightsError) {
      throw insightsError
    }

    // Aggregate metrics by campaign
    const campaignMetrics: Record<string, any> = {}
    
    insights?.forEach(insight => {
      const campaignId = insight.campaign_id
      if (!campaignMetrics[campaignId]) {
        campaignMetrics[campaignId] = {
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_conversions: 0,
          total_conversion_values: 0,
          ctr_sum: 0,
          cpc_sum: 0,
          roas_sum: 0,
          count: 0,
        }
      }
      
      const metrics = campaignMetrics[campaignId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_impressions += parseInt(insight.impressions?.toString() || '0')
      metrics.total_clicks += parseInt(insight.clicks?.toString() || '0')
      metrics.total_conversions += parseFloat(insight.conversions?.toString() || '0')
      metrics.total_conversion_values += parseFloat(insight.conversion_values?.toString() || '0')
      metrics.ctr_sum += parseFloat(insight.ctr?.toString() || '0')
      metrics.cpc_sum += parseFloat(insight.cpc?.toString() || '0')
      metrics.roas_sum += parseFloat(insight.roas?.toString() || '0')
      metrics.count++
    })

    // Get active ad counts per campaign
    const { data: adCounts, error: adCountsError } = await supabase
      .from('ads')
      .select('campaign_id')
      .eq('status', 'ACTIVE')

    if (adCountsError) {
      console.warn('Failed to get ad counts:', adCountsError)
    }

    const adCountMap = (adCounts || []).reduce((acc, ad) => {
      acc[ad.campaign_id] = (acc[ad.campaign_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Combine campaign data with metrics
    const enrichedCampaigns = campaigns?.map(campaign => {
      const metrics = campaignMetrics[campaign.id] || {
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_conversion_values: 0,
        ctr_sum: 0,
        cpc_sum: 0,
        roas_sum: 0,
        count: 0,
      }

      const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0
      const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0
      const avgRoas = metrics.count > 0 ? metrics.roas_sum / metrics.count : 0

      return {
        ...campaign,
        total_spend: Math.round(metrics.total_spend * 100) / 100,
        total_impressions: metrics.total_impressions,
        total_clicks: metrics.total_clicks,
        total_conversions: Math.round(metrics.total_conversions * 100) / 100,
        avg_ctr: Math.round(avgCtr * 100) / 100,
        avg_cpc: Math.round(avgCpc * 100) / 100,
        avg_roas: Math.round(avgRoas * 100) / 100,
        active_ads: adCountMap[campaign.id] || 0,
      }
    }) || []

    // Sort by spend descending
    enrichedCampaigns.sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))

    return NextResponse.json({
      campaigns: enrichedCampaigns,
      total_campaigns: enrichedCampaigns.length
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}