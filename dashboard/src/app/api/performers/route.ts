import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const metric = searchParams.get('metric') || 'roas'
    const accountId = searchParams.get('accountId')
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId parameter is required' },
        { status: 400 }
      )
    }
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    // Get campaign insights with aggregated metrics
    const { data: campaignInsights, error: campaignError } = await supabase
      .from('daily_ad_insights')
      .select(`
        campaign_id,
        spend,
        impressions,
        link_clicks,
        purchases,
        purchase_values,
        ctr,
        cpc
      `)
      .eq('account_id', accountId)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (campaignError) {
      throw campaignError
    }

    // Get ad insights with aggregated metrics
    const { data: adInsights, error: adError } = await supabase
      .from('daily_ad_insights')
      .select(`
        ad_id,
        spend,
        impressions,
        link_clicks,
        purchases,
        purchase_values,
        ctr,
        cpc
      `)
      .eq('account_id', accountId)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (adError) {
      throw adError
    }

    // Get campaign names
    const { data: campaigns, error: campaignNamesError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('account_id', accountId)

    if (campaignNamesError) {
      throw campaignNamesError
    }

    // Get ad names
    const { data: ads, error: adNamesError } = await supabase
      .from('ads')
      .select('id, name')
      .eq('account_id', accountId)

    if (adNamesError) {
      throw adNamesError
    }

    // Create lookup maps
    const campaignNameMap = campaigns.reduce((acc, campaign) => {
      acc[campaign.id] = campaign.name
      return acc
    }, {} as Record<string, string>)

    const adNameMap = ads.reduce((acc, ad) => {
      acc[ad.id] = ad.name
      return acc
    }, {} as Record<string, string>)

    // Aggregate campaign metrics
    const campaignMetrics: Record<string, any> = {}
    campaignInsights?.forEach(insight => {
      const campaignId = insight.campaign_id
      if (!campaignMetrics[campaignId]) {
        campaignMetrics[campaignId] = {
          total_spend: 0,
          total_impressions: 0,
          total_link_clicks: 0,
          total_purchases: 0,
          total_purchase_values: 0,
          ctr_sum: 0,
          cpc_sum: 0,
          count: 0,
        }
      }
      
      const metrics = campaignMetrics[campaignId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_impressions += parseInt(insight.impressions?.toString() || '0')
      metrics.total_link_clicks += parseInt(insight.link_clicks?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.total_purchase_values += parseFloat(insight.purchase_values?.toString() || '0')
      metrics.ctr_sum += parseFloat(insight.ctr?.toString() || '0')
      metrics.cpc_sum += parseFloat(insight.cpc?.toString() || '0')
      metrics.count++
    })

    // Aggregate ad metrics
    const adMetrics: Record<string, any> = {}
    adInsights?.forEach(insight => {
      const adId = insight.ad_id
      if (!adMetrics[adId]) {
        adMetrics[adId] = {
          total_spend: 0,
          total_impressions: 0,
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
      metrics.total_link_clicks += parseInt(insight.link_clicks?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.total_purchase_values += parseFloat(insight.purchase_values?.toString() || '0')
      metrics.ctr_sum += parseFloat(insight.ctr?.toString() || '0')
      metrics.cpc_sum += parseFloat(insight.cpc?.toString() || '0')
      metrics.count++
    })

    // Format campaign performers
    const campaignPerformers = Object.entries(campaignMetrics)
      .filter(([_, metrics]) => metrics.total_spend > 0) // Only include campaigns with spend
      .map(([campaignId, metrics]) => {
        const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0
        const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0
        const purchaseCPA = metrics.total_purchases > 0 ? metrics.total_spend / metrics.total_purchases : 0
        const purchaseROAS = metrics.total_spend > 0 ? metrics.total_purchase_values / metrics.total_spend : 0

        return {
          id: campaignId,
          name: campaignNameMap[campaignId] || `Campaign ${campaignId}`,
          type: 'campaign' as const,
          total_spend: Math.round(metrics.total_spend * 100) / 100,
          total_impressions: metrics.total_impressions,
          total_link_clicks: metrics.total_link_clicks,
          purchases: Math.round(metrics.total_purchases * 100) / 100,
          purchase_values: Math.round(metrics.total_purchase_values * 100) / 100,
          avg_ctr: Math.round(avgCtr * 100) / 100,
          avg_cpc: Math.round(avgCpc * 100) / 100,
          purchase_cpa: Math.round(purchaseCPA * 100) / 100,
          purchase_roas: Math.round(purchaseROAS * 100) / 100,
        }
      })

    // Format ad performers
    const adPerformers = Object.entries(adMetrics)
      .filter(([_, metrics]) => metrics.total_spend > 0) // Only include ads with spend
      .map(([adId, metrics]) => {
        const avgCtr = metrics.count > 0 ? metrics.ctr_sum / metrics.count : 0
        const avgCpc = metrics.count > 0 ? metrics.cpc_sum / metrics.count : 0
        const purchaseCPA = metrics.total_purchases > 0 ? metrics.total_spend / metrics.total_purchases : 0
        const purchaseROAS = metrics.total_spend > 0 ? metrics.total_purchase_values / metrics.total_spend : 0

        return {
          id: adId,
          name: adNameMap[adId] || `Ad ${adId}`,
          type: 'ad' as const,
          total_spend: Math.round(metrics.total_spend * 100) / 100,
          total_impressions: metrics.total_impressions,
          total_link_clicks: metrics.total_link_clicks,
          purchases: Math.round(metrics.total_purchases * 100) / 100,
          purchase_values: Math.round(metrics.total_purchase_values * 100) / 100,
          avg_ctr: Math.round(avgCtr * 100) / 100,
          avg_cpc: Math.round(avgCpc * 100) / 100,
          purchase_cpa: Math.round(purchaseCPA * 100) / 100,
          purchase_roas: Math.round(purchaseROAS * 100) / 100,
        }
      })

    // Combine all performers
    const allPerformers = [...campaignPerformers, ...adPerformers]

    // Sort based on metric
    const getSortValue = (performer: any) => {
      switch (metric) {
        case 'spend':
          return performer.total_spend
        case 'roas':
          return performer.purchase_roas
        case 'cpa':
          return performer.purchase_cpa
        case 'ctr':
          return performer.avg_ctr
        default:
          return performer.purchase_roas
      }
    }

    // For CPA, lower is better, so we reverse the sort
    if (metric === 'cpa') {
      allPerformers.sort((a, b) => getSortValue(a) - getSortValue(b))
    } else {
      allPerformers.sort((a, b) => getSortValue(b) - getSortValue(a))
    }

    // Get top and bottom performers
    const topPerformers = allPerformers.slice(0, 10)
    const bottomPerformers = [...allPerformers].reverse().slice(0, 10)

    return NextResponse.json({
      top: topPerformers,
      bottom: bottomPerformers,
      metric,
      total_performers: allPerformers.length
    })
  } catch (error) {
    console.error('Error fetching performers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performers' },
      { status: 500 }
    )
  }
}