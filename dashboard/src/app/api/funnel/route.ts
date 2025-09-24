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

    // Get insights data for the funnel
    const { data: insights, error } = await supabase
      .from('daily_ad_insights')
      .select(`
        impressions,
        clicks,
        link_clicks,
        add_to_carts,
        leads,
        purchases,
        purchase_values,
        spend
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)

    if (error) {
      throw error
    }

    if (!insights || insights.length === 0) {
      return NextResponse.json({
        metrics: {
          impressions: 0,
          clicks: 0,
          link_clicks: 0,
          add_to_carts: 0,
          leads: 0,
          purchases: 0,
          total_spend: 0,
          total_purchase_values: 0,
        },
        period: { days, dateStart, dateEnd }
      })
    }

    // Aggregate all funnel metrics
    const metrics = insights.reduce((acc, row) => {
      acc.impressions += parseInt(row.impressions?.toString() || '0')
      acc.clicks += parseInt(row.clicks?.toString() || '0')
      acc.link_clicks += parseInt(row.link_clicks?.toString() || '0')
      acc.add_to_carts += parseFloat(row.add_to_carts?.toString() || '0')
      acc.leads += parseFloat(row.leads?.toString() || '0')
      acc.purchases += parseFloat(row.purchases?.toString() || '0')
      acc.total_spend += parseFloat(row.spend?.toString() || '0')
      acc.total_purchase_values += parseFloat(row.purchase_values?.toString() || '0')
      return acc
    }, {
      impressions: 0,
      clicks: 0,
      link_clicks: 0,
      add_to_carts: 0,
      leads: 0,
      purchases: 0,
      total_spend: 0,
      total_purchase_values: 0,
    })

    // Round values for clean display
    const cleanMetrics = {
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      link_clicks: metrics.link_clicks,
      add_to_carts: Math.round(metrics.add_to_carts * 100) / 100,
      leads: Math.round(metrics.leads * 100) / 100,
      purchases: Math.round(metrics.purchases * 100) / 100,
      total_spend: Math.round(metrics.total_spend * 100) / 100,
      total_purchase_values: Math.round(metrics.total_purchase_values * 100) / 100,
    }

    return NextResponse.json({
      metrics: cleanMetrics,
      period: { days, dateStart, dateEnd }
    })
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}