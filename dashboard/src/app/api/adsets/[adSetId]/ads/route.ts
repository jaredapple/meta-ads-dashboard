import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ adSetId: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    // Get ads for the ad set
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select(`
        id,
        name,
        status,
        creative_id
      `)
      .eq('ad_set_id', resolvedParams.adSetId)

    if (adsError) {
      throw adsError
    }

    // Get insights data for these ads
    const { data: insights, error: insightsError } = await supabase
      .from('daily_ad_insights')
      .select(`
        ad_id,
        spend,
        impressions,
        clicks,
        link_clicks,
        purchases,
        purchase_values,
        ctr,
        cpc
      `)
      .eq('ad_set_id', resolvedParams.adSetId)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (insightsError) {
      throw insightsError
    }

    // Aggregate metrics by ad
    const adMetrics: Record<string, any> = {}
    
    insights?.forEach(insight => {
      const adId = insight.ad_id
      if (!adMetrics[adId]) {
        adMetrics[adId] = {
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_link_clicks: 0,
          total_purchases: 0,
          total_purchase_values: 0,
          ctr_sum: 0,
          cpc_sum: 0,
          count: 0,
        }
      }
      
      const metrics = adMetrics[adId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_impressions += parseInt(insight.impressions?.toString() || '0')
      metrics.total_clicks += parseInt(insight.clicks?.toString() || '0')
      metrics.total_link_clicks += parseInt(insight.link_clicks?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.total_purchase_values += parseFloat(insight.purchase_values?.toString() || '0')
      metrics.ctr_sum += parseFloat(insight.ctr?.toString() || '0')
      metrics.cpc_sum += parseFloat(insight.cpc?.toString() || '0')
      metrics.count++
    })

    // Combine ad data with metrics
    const enrichedAds = ads?.map(ad => {
      const metrics = adMetrics[ad.id] || {
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_link_clicks: 0,
        total_purchases: 0,
        total_purchase_values: 0,
        ctr_sum: 0,
        cpc_sum: 0,
        count: 0,
      }

      const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0
      const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0
      const purchaseCPA = metrics.total_purchases > 0 ? metrics.total_spend / metrics.total_purchases : 0
      const purchaseROAS = metrics.total_spend > 0 ? metrics.total_purchase_values / metrics.total_spend : 0

      return {
        ...ad,
        total_spend: Math.round(metrics.total_spend * 100) / 100,
        total_impressions: metrics.total_impressions,
        total_clicks: metrics.total_clicks,
        total_link_clicks: metrics.total_link_clicks,
        purchases: Math.round(metrics.total_purchases * 100) / 100,
        purchase_values: Math.round(metrics.total_purchase_values * 100) / 100,
        ctr: Math.round(avgCtr * 100) / 100,
        cpc: Math.round(avgCpc * 100) / 100,
        purchase_cpa: Math.round(purchaseCPA * 100) / 100,
        purchase_roas: Math.round(purchaseROAS * 100) / 100,
      }
    }) || []

    // Sort by spend descending
    enrichedAds.sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))

    return NextResponse.json({
      ads: enrichedAds,
      adset_id: resolvedParams.adSetId,
      total_ads: enrichedAds.length
    })
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    )
  }
}