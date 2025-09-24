import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    // Get ad sets for the campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select(`
        id,
        name,
        status,
        daily_budget,
        lifetime_budget
      `)
      .eq('campaign_id', params.campaignId)

    if (adSetsError) {
      throw adSetsError
    }

    // Get insights data for these ad sets
    const { data: insights, error: insightsError } = await supabase
      .from('daily_ad_insights')
      .select(`
        ad_set_id,
        spend,
        impressions,
        clicks,
        link_clicks,
        purchases,
        ctr,
        cpc
      `)
      .eq('campaign_id', params.campaignId)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (insightsError) {
      throw insightsError
    }

    // Get active ad counts per ad set
    const { data: adCounts, error: adCountsError } = await supabase
      .from('ads')
      .select('ad_set_id')
      .eq('status', 'ACTIVE')
      .eq('campaign_id', params.campaignId)

    if (adCountsError) {
      console.warn('Failed to get ad counts:', adCountsError)
    }

    const adCountMap = (adCounts || []).reduce((acc, ad) => {
      acc[ad.ad_set_id] = (acc[ad.ad_set_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Aggregate metrics by ad set
    const adSetMetrics: Record<string, any> = {}
    
    insights?.forEach(insight => {
      const adSetId = insight.ad_set_id
      if (!adSetMetrics[adSetId]) {
        adSetMetrics[adSetId] = {
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_link_clicks: 0,
          total_purchases: 0,
          ctr_sum: 0,
          cpc_sum: 0,
          count: 0,
        }
      }
      
      const metrics = adSetMetrics[adSetId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_impressions += parseInt(insight.impressions?.toString() || '0')
      metrics.total_clicks += parseInt(insight.clicks?.toString() || '0')
      metrics.total_link_clicks += parseInt(insight.link_clicks?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.ctr_sum += parseFloat(insight.ctr?.toString() || '0')
      metrics.cpc_sum += parseFloat(insight.cpc?.toString() || '0')
      metrics.count++
    })

    // Combine ad set data with metrics
    const enrichedAdSets = adSets?.map(adSet => {
      const metrics = adSetMetrics[adSet.id] || {
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_link_clicks: 0,
        total_purchases: 0,
        ctr_sum: 0,
        cpc_sum: 0,
        count: 0,
      }

      const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0
      const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0

      return {
        ...adSet,
        total_spend: Math.round(metrics.total_spend * 100) / 100,
        total_impressions: metrics.total_impressions,
        total_clicks: metrics.total_clicks,
        total_link_clicks: metrics.total_link_clicks,
        total_purchases: Math.round(metrics.total_purchases * 100) / 100,
        avg_ctr: Math.round(avgCtr * 100) / 100,
        avg_cpc: Math.round(avgCpc * 100) / 100,
        active_ads: adCountMap[adSet.id] || 0,
      }
    }) || []

    // Sort by spend descending
    enrichedAdSets.sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))

    return NextResponse.json({
      adsets: enrichedAdSets,
      campaign_id: params.campaignId,
      total_adsets: enrichedAdSets.length
    })
  } catch (error) {
    console.error('Error fetching ad sets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad sets' },
      { status: 500 }
    )
  }
}