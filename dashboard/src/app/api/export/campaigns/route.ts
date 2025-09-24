import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const format = searchParams.get('format') || 'csv'
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    // Get campaign structure data
    const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
      supabase.from('campaigns').select('*'),
      supabase.from('adsets').select('*'),
      supabase.from('ads').select('*')
    ])

    if (campaignsRes.error || adsetsRes.error || adsRes.error) {
      throw new Error('Failed to fetch campaign structure data')
    }

    // Get performance data for the period
    const { data: insights, error: insightsError } = await supabase
      .from('daily_ad_insights')
      .select(`
        campaign_id,
        adset_id,
        ad_id,
        impressions,
        clicks,
        link_clicks,
        spend,
        purchases,
        purchase_values
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (insightsError) {
      throw insightsError
    }

    // Aggregate performance by campaign, adset, and ad
    const campaignMetrics: Record<string, any> = {}
    const adsetMetrics: Record<string, any> = {}
    const adMetrics: Record<string, any> = {}

    insights?.forEach(row => {
      const spend = parseFloat(row.spend?.toString() || '0')
      const impressions = parseInt(row.impressions?.toString() || '0')
      const clicks = parseInt(row.clicks?.toString() || '0')
      const linkClicks = parseInt(row.link_clicks?.toString() || '0')
      const purchases = parseFloat(row.purchases?.toString() || '0')
      const purchaseValues = parseFloat(row.purchase_values?.toString() || '0')

      // Campaign aggregation
      if (!campaignMetrics[row.campaign_id]) {
        campaignMetrics[row.campaign_id] = {
          spend: 0, impressions: 0, clicks: 0, link_clicks: 0, purchases: 0, purchase_values: 0
        }
      }
      const camMetrics = campaignMetrics[row.campaign_id]
      camMetrics.spend += spend
      camMetrics.impressions += impressions
      camMetrics.clicks += clicks
      camMetrics.link_clicks += linkClicks
      camMetrics.purchases += purchases
      camMetrics.purchase_values += purchaseValues

      // Adset aggregation
      if (!adsetMetrics[row.adset_id]) {
        adsetMetrics[row.adset_id] = {
          campaign_id: row.campaign_id,
          spend: 0, impressions: 0, clicks: 0, link_clicks: 0, purchases: 0, purchase_values: 0
        }
      }
      const adsetMet = adsetMetrics[row.adset_id]
      adsetMet.spend += spend
      adsetMet.impressions += impressions
      adsetMet.clicks += clicks
      adsetMet.link_clicks += linkClicks
      adsetMet.purchases += purchases
      adsetMet.purchase_values += purchaseValues

      // Ad aggregation
      if (!adMetrics[row.ad_id]) {
        adMetrics[row.ad_id] = {
          campaign_id: row.campaign_id,
          adset_id: row.adset_id,
          spend: 0, impressions: 0, clicks: 0, link_clicks: 0, purchases: 0, purchase_values: 0
        }
      }
      const adMet = adMetrics[row.ad_id]
      adMet.spend += spend
      adMet.impressions += impressions
      adMet.clicks += clicks
      adMet.link_clicks += linkClicks
      adMet.purchases += purchases
      adMet.purchase_values += purchaseValues
    })

    // Build export data
    const exportData = {
      campaigns: campaignsRes.data?.map(campaign => {
        const metrics = campaignMetrics[campaign.id] || {}
        const ctr = metrics.impressions > 0 ? (metrics.link_clicks / metrics.impressions) * 100 : 0
        const cpc = metrics.link_clicks > 0 ? metrics.spend / metrics.link_clicks : 0
        const cpa = metrics.purchases > 0 ? metrics.spend / metrics.purchases : 0
        const roas = metrics.spend > 0 ? metrics.purchase_values / metrics.spend : 0

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.effective_status,
          objective: campaign.objective,
          spend: Math.round((metrics.spend || 0) * 100) / 100,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          link_clicks: metrics.link_clicks || 0,
          ctr: Math.round(ctr * 100) / 100,
          cpc: Math.round(cpc * 100) / 100,
          purchases: Math.round((metrics.purchases || 0) * 100) / 100,
          purchase_values: Math.round((metrics.purchase_values || 0) * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          roas: Math.round(roas * 100) / 100
        }
      }) || [],

      adsets: adsetsRes.data?.map(adset => {
        const metrics = adsetMetrics[adset.id] || {}
        const campaign = campaignsRes.data?.find(c => c.id === adset.campaign_id)
        const ctr = metrics.impressions > 0 ? (metrics.link_clicks / metrics.impressions) * 100 : 0
        const cpc = metrics.link_clicks > 0 ? metrics.spend / metrics.link_clicks : 0
        const cpa = metrics.purchases > 0 ? metrics.spend / metrics.purchases : 0
        const roas = metrics.spend > 0 ? metrics.purchase_values / metrics.spend : 0

        return {
          id: adset.id,
          name: adset.name,
          campaign_name: campaign?.name || 'Unknown',
          status: adset.effective_status,
          targeting: adset.targeting ? JSON.stringify(adset.targeting) : '',
          spend: Math.round((metrics.spend || 0) * 100) / 100,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          link_clicks: metrics.link_clicks || 0,
          ctr: Math.round(ctr * 100) / 100,
          cpc: Math.round(cpc * 100) / 100,
          purchases: Math.round((metrics.purchases || 0) * 100) / 100,
          purchase_values: Math.round((metrics.purchase_values || 0) * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          roas: Math.round(roas * 100) / 100
        }
      }) || [],

      ads: adsRes.data?.map(ad => {
        const metrics = adMetrics[ad.id] || {}
        const campaign = campaignsRes.data?.find(c => c.id === metrics.campaign_id)
        const adset = adsetsRes.data?.find(a => a.id === metrics.adset_id)
        const ctr = metrics.impressions > 0 ? (metrics.link_clicks / metrics.impressions) * 100 : 0
        const cpc = metrics.link_clicks > 0 ? metrics.spend / metrics.link_clicks : 0
        const cpa = metrics.purchases > 0 ? metrics.spend / metrics.purchases : 0
        const roas = metrics.spend > 0 ? metrics.purchase_values / metrics.spend : 0

        return {
          id: ad.id,
          name: ad.name,
          campaign_name: campaign?.name || 'Unknown',
          adset_name: adset?.name || 'Unknown',
          status: ad.effective_status,
          spend: Math.round((metrics.spend || 0) * 100) / 100,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          link_clicks: metrics.link_clicks || 0,
          ctr: Math.round(ctr * 100) / 100,
          cpc: Math.round(cpc * 100) / 100,
          purchases: Math.round((metrics.purchases || 0) * 100) / 100,
          purchase_values: Math.round((metrics.purchase_values || 0) * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          roas: Math.round(roas * 100) / 100
        }
      }) || []
    }

    if (format === 'json') {
      return NextResponse.json({
        export_type: 'campaign_structure',
        date_range: { start: dateStart, end: dateEnd, days },
        generated_at: new Date().toISOString(),
        summary: {
          total_campaigns: exportData.campaigns.length,
          total_adsets: exportData.adsets.length,
          total_ads: exportData.ads.length
        },
        data: exportData
      })
    }

    if (format === 'csv') {
      // Create separate CSV sections for campaigns, adsets, and ads
      const campaignHeaders = [
        'Campaign ID', 'Campaign Name', 'Status', 'Objective', 'Spend ($)', 'Impressions',
        'Clicks', 'Link Clicks', 'CTR (%)', 'CPC ($)', 'Purchases', 'Purchase Values ($)', 'CPA ($)', 'ROAS (x)'
      ]

      const csvSections = [
        '# CAMPAIGNS',
        campaignHeaders.join(','),
        ...exportData.campaigns.map(c => [
          c.id, `"${c.name}"`, c.status, c.objective, c.spend, c.impressions,
          c.clicks, c.link_clicks, c.ctr, c.cpc, c.purchases, c.purchase_values, c.cpa, c.roas
        ].join(',')),
        '',
        '# AD SETS',
        'AdSet ID,AdSet Name,Campaign Name,Status,Spend ($),Impressions,Clicks,Link Clicks,CTR (%),CPC ($),Purchases,Purchase Values ($),CPA ($),ROAS (x)',
        ...exportData.adsets.map(a => [
          a.id, `"${a.name}"`, `"${a.campaign_name}"`, a.status, a.spend, a.impressions,
          a.clicks, a.link_clicks, a.ctr, a.cpc, a.purchases, a.purchase_values, a.cpa, a.roas
        ].join(',')),
        '',
        '# ADS',
        'Ad ID,Ad Name,Campaign Name,AdSet Name,Status,Spend ($),Impressions,Clicks,Link Clicks,CTR (%),CPC ($),Purchases,Purchase Values ($),CPA ($),ROAS (x)',
        ...exportData.ads.map(a => [
          a.id, `"${a.name}"`, `"${a.campaign_name}"`, `"${a.adset_name}"`, a.status, a.spend, a.impressions,
          a.clicks, a.link_clicks, a.ctr, a.cpc, a.purchases, a.purchase_values, a.cpa, a.roas
        ].join(','))
      ]

      return new NextResponse(csvSections.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="campaigns-export-${dateStart}-to-${dateEnd}.csv"`
        }
      })
    }

    return NextResponse.json({
      error: 'PDF export not yet implemented. Please use CSV or JSON format.',
      available_formats: ['csv', 'json']
    }, { status: 400 })

  } catch (error) {
    console.error('Error exporting campaign data:', error)
    return NextResponse.json(
      { error: 'Failed to export campaign data' },
      { status: 500 }
    )
  }
}