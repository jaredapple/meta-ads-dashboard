import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    // Get campaign data with aggregated metrics
    const { data: campaignInsights, error: campaignError } = await supabase
      .from('daily_ad_insights')
      .select(`
        campaign_id,
        spend,
        purchases,
        purchase_values
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (campaignError) {
      throw campaignError
    }

    // Get ad data with aggregated metrics
    const { data: adInsights, error: adError } = await supabase
      .from('daily_ad_insights')
      .select(`
        ad_id,
        spend,
        purchases,
        purchase_values
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (adError) {
      throw adError
    }

    // Get campaign names
    const { data: campaigns, error: campaignNamesError } = await supabase
      .from('campaigns')
      .select('id, name')

    if (campaignNamesError) {
      throw campaignNamesError
    }

    // Get ad names
    const { data: ads, error: adNamesError } = await supabase
      .from('ads')
      .select('id, name')

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
          total_purchases: 0,
          total_purchase_values: 0,
        }
      }
      
      const metrics = campaignMetrics[campaignId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.total_purchase_values += parseFloat(insight.purchase_values?.toString() || '0')
    })

    // Aggregate ad metrics
    const adMetrics: Record<string, any> = {}
    adInsights?.forEach(insight => {
      const adId = insight.ad_id
      if (!adMetrics[adId]) {
        adMetrics[adId] = {
          total_spend: 0,
          total_purchases: 0,
          total_purchase_values: 0,
        }
      }
      
      const metrics = adMetrics[adId]
      metrics.total_spend += parseFloat(insight.spend?.toString() || '0')
      metrics.total_purchases += parseFloat(insight.purchases?.toString() || '0')
      metrics.total_purchase_values += parseFloat(insight.purchase_values?.toString() || '0')
    })

    // Create data points for scatter plot
    const dataPoints: any[] = []

    // Add campaign data points
    Object.entries(campaignMetrics)
      .filter(([_, metrics]) => metrics.total_spend > 0) // Only include campaigns with spend
      .forEach(([campaignId, metrics]) => {
        const roas = metrics.total_spend > 0 ? metrics.total_purchase_values / metrics.total_spend : 0
        const efficiency_score = Math.min(100, Math.max(0, (roas * 20))) // ROAS of 5x = 100% efficiency

        dataPoints.push({
          id: campaignId,
          name: campaignNameMap[campaignId] || `Campaign ${campaignId}`,
          type: 'campaign',
          spend: Math.round(metrics.total_spend * 100) / 100,
          roas: Math.round(roas * 100) / 100,
          purchases: Math.round(metrics.total_purchases * 100) / 100,
          efficiency_score: Math.round(efficiency_score * 100) / 100,
        })
      })

    // Add ad data points
    Object.entries(adMetrics)
      .filter(([_, metrics]) => metrics.total_spend > 0) // Only include ads with spend
      .forEach(([adId, metrics]) => {
        const roas = metrics.total_spend > 0 ? metrics.total_purchase_values / metrics.total_spend : 0
        const efficiency_score = Math.min(100, Math.max(0, (roas * 20))) // ROAS of 5x = 100% efficiency

        dataPoints.push({
          id: adId,
          name: adNameMap[adId] || `Ad ${adId}`,
          type: 'ad',
          spend: Math.round(metrics.total_spend * 100) / 100,
          roas: Math.round(roas * 100) / 100,
          purchases: Math.round(metrics.total_purchases * 100) / 100,
          efficiency_score: Math.round(efficiency_score * 100) / 100,
        })
      })

    // Calculate correlation coefficient between spend and ROAS
    const calculateCorrelation = (points: any[]) => {
      if (points.length < 2) return 0

      const n = points.length
      const sumX = points.reduce((sum, p) => sum + p.spend, 0)
      const sumY = points.reduce((sum, p) => sum + p.roas, 0)
      const sumXY = points.reduce((sum, p) => sum + (p.spend * p.roas), 0)
      const sumX2 = points.reduce((sum, p) => sum + (p.spend * p.spend), 0)
      const sumY2 = points.reduce((sum, p) => sum + (p.roas * p.roas), 0)

      const numerator = (n * sumXY) - (sumX * sumY)
      const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)))

      return denominator === 0 ? 0 : numerator / denominator
    }

    const correlation = calculateCorrelation(dataPoints)

    // Calculate averages
    const avgSpend = dataPoints.length > 0 ? 
      dataPoints.reduce((sum, p) => sum + p.spend, 0) / dataPoints.length : 0
    const avgROAS = dataPoints.length > 0 ? 
      dataPoints.reduce((sum, p) => sum + p.roas, 0) / dataPoints.length : 0

    // Count campaigns and ads
    const totalCampaigns = Object.keys(campaignMetrics).length
    const totalAds = Object.keys(adMetrics).length

    return NextResponse.json({
      data_points: dataPoints,
      correlation_coefficient: Math.round(correlation * 1000) / 1000,
      avg_roas: Math.round(avgROAS * 100) / 100,
      avg_spend: Math.round(avgSpend * 100) / 100,
      total_campaigns: totalCampaigns,
      total_ads: totalAds,
      period: { days, dateStart, dateEnd }
    })
  } catch (error) {
    console.error('Error fetching correlation data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch correlation data' },
      { status: 500 }
    )
  }
}