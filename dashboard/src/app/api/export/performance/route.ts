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

    // Get performance data
    const { data: insights, error } = await supabase
      .from('daily_ad_insights')
      .select(`
        date_start,
        campaign_id,
        ad_id,
        impressions,
        clicks,
        link_clicks,
        spend,
        purchases,
        purchase_values,
        add_to_carts,
        leads
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)
      .order('date_start', { ascending: true })

    if (error) {
      throw error
    }

    // Get campaign and ad names for context
    const [campaignsRes, adsRes] = await Promise.all([
      supabase.from('campaigns').select('id, name'),
      supabase.from('ads').select('id, name')
    ])

    const campaignNames = campaignsRes.data?.reduce((acc, c) => {
      acc[c.id] = c.name
      return acc
    }, {} as Record<string, string>) || {}

    const adNames = adsRes.data?.reduce((acc, a) => {
      acc[a.id] = a.name
      return acc
    }, {} as Record<string, string>) || {}

    // Process data with calculated metrics
    const processedData = insights?.map(row => {
      const spend = parseFloat(row.spend?.toString() || '0')
      const impressions = parseInt(row.impressions?.toString() || '0')
      const clicks = parseInt(row.clicks?.toString() || '0')
      const linkClicks = parseInt(row.link_clicks?.toString() || '0')
      const purchases = parseFloat(row.purchases?.toString() || '0')
      const purchaseValues = parseFloat(row.purchase_values?.toString() || '0')
      const addToCarts = parseFloat(row.add_to_carts?.toString() || '0')
      const leads = parseFloat(row.leads?.toString() || '0')

      const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0
      const cpc = linkClicks > 0 ? spend / linkClicks : 0
      const cpa = purchases > 0 ? spend / purchases : 0
      const roas = spend > 0 ? purchaseValues / spend : 0

      return {
        date: row.date_start,
        campaign_name: campaignNames[row.campaign_id] || `Campaign ${row.campaign_id}`,
        ad_name: adNames[row.ad_id] || `Ad ${row.ad_id}`,
        impressions,
        clicks,
        link_clicks: linkClicks,
        ctr: Math.round(ctr * 100) / 100,
        spend: Math.round(spend * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        add_to_carts: Math.round(addToCarts * 100) / 100,
        leads: Math.round(leads * 100) / 100,
        purchases: Math.round(purchases * 100) / 100,
        purchase_values: Math.round(purchaseValues * 100) / 100,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100
      }
    }) || []

    if (format === 'json') {
      return NextResponse.json({
        export_type: 'performance_data',
        date_range: { start: dateStart, end: dateEnd, days },
        generated_at: new Date().toISOString(),
        total_records: processedData.length,
        data: processedData
      })
    }

    if (format === 'csv') {
      const headers = [
        'Date', 'Campaign Name', 'Ad Name', 'Impressions', 'Clicks', 'Link Clicks',
        'CTR (%)', 'Spend ($)', 'CPC ($)', 'Add to Carts', 'Leads', 'Purchases',
        'Purchase Values ($)', 'CPA ($)', 'ROAS (x)'
      ]

      const csvRows = [
        headers.join(','),
        ...processedData.map(row => [
          row.date,
          `"${row.campaign_name}"`,
          `"${row.ad_name}"`,
          row.impressions,
          row.clicks,
          row.link_clicks,
          row.ctr,
          row.spend,
          row.cpc,
          row.add_to_carts,
          row.leads,
          row.purchases,
          row.purchase_values,
          row.cpa,
          row.roas
        ].join(','))
      ]

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance-export-${dateStart}-to-${dateEnd}.csv"`
        }
      })
    }

    // PDF format would require a PDF generation library like puppeteer or jsPDF
    // For now, return JSON with a note
    return NextResponse.json({
      error: 'PDF export not yet implemented. Please use CSV or JSON format.',
      available_formats: ['csv', 'json']
    }, { status: 400 })

  } catch (error) {
    console.error('Error exporting performance data:', error)
    return NextResponse.json(
      { error: 'Failed to export performance data' },
      { status: 500 }
    )
  }
}