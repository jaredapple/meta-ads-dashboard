import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const period = searchParams.get('period') || 'last_n_days' // 'today', 'yesterday', 'last_n_days'
    const accountId = searchParams.get('accountId') // Support filtering by account
    
    // Get account timezone if accountId is provided
    let accountTimezone = 'America/Los_Angeles' // Default to PST
    if (accountId) {
      const { data: accountData } = await supabase
        .from('client_accounts')
        .select('timezone')
        .eq('meta_account_id', accountId)
        .single()
      
      if (accountData?.timezone) {
        accountTimezone = accountData.timezone
      }
    }
    
    // Calculate date range based on period using account-specific timezone
    let dateStart: string
    let dateEnd: string
    
    // Get current date in the account's timezone
    const nowInAccountTZ = new Date().toLocaleString("en-US", {timeZone: accountTimezone})
    const today = new Date(nowInAccountTZ)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    switch (period) {
      case 'today':
        dateStart = formatDate(today)
        dateEnd = formatDate(today)
        break
      case 'yesterday':
        dateStart = formatDate(yesterday)
        dateEnd = formatDate(yesterday)
        break
      case 'last_n_days':
      default:
        // Last N days should exclude today (show days -N to -1)
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() - 1) // Yesterday as end date
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - (days - 1)) // Go back N-1 more days from yesterday
        
        dateStart = formatDate(startDate)
        dateEnd = formatDate(endDate)
        break
    }

    // Build query with optional account filter
    let query = supabase
      .from('daily_ad_insights')
      .select(`
        date_start,
        account_id,
        spend,
        impressions,
        clicks,
        link_clicks,
        purchases,
        purchase_values,
        conversions,
        conversion_values,
        ctr,
        cpc,
        roas
      `)
      .gte('date_start', dateStart)
      .lte('date_start', dateEnd)
    
    // Filter by account if specified
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    
    const { data: insights, error } = await query
      .order('date_start', { ascending: true })

    if (error) {
      throw error
    }

    if (!insights || insights.length === 0) {
      return NextResponse.json({
        summary: {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalLinkClicks: 0,
          totalPurchases: 0,
          totalPurchaseValues: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          avgCTR: 0,
          avgCPC: 0,
          avgROAS: 0,
          purchaseCPA: 0,
          purchaseROAS: 0,
        },
        dailyData: [],
        period: { days, period, dateStart, dateEnd }
      })
    }

    // Calculate summary metrics using link_clicks for accurate CTR/CPC
    const totalSpend = insights.reduce((sum, row) => sum + parseFloat(row.spend?.toString() || '0'), 0)
    const totalImpressions = insights.reduce((sum, row) => sum + parseInt(row.impressions?.toString() || '0'), 0)
    const totalClicks = insights.reduce((sum, row) => sum + parseInt(row.clicks?.toString() || '0'), 0)
    const totalLinkClicks = insights.reduce((sum, row) => sum + parseInt(row.link_clicks?.toString() || '0'), 0)
    const totalPurchases = insights.reduce((sum, row) => sum + parseFloat(row.purchases?.toString() || '0'), 0)
    const totalPurchaseValues = insights.reduce((sum, row) => sum + parseFloat(row.purchase_values?.toString() || '0'), 0)
    const totalConversions = insights.reduce((sum, row) => sum + parseFloat(row.conversions?.toString() || '0'), 0)
    const totalConversionValue = insights.reduce((sum, row) => sum + parseFloat(row.conversion_values?.toString() || '0'), 0)

    // Use link_clicks for CTR/CPC to match Meta Ads Manager
    const avgCTR = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0
    const avgCPC = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0
    const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0
    
    // Purchase-specific metrics
    const purchaseCPA = totalPurchases > 0 ? totalSpend / totalPurchases : 0
    const purchaseROAS = totalSpend > 0 ? totalPurchaseValues / totalSpend : 0

    // Group by date for daily data
    const dailyData: Record<string, any> = {}
    
    insights.forEach(row => {
      const date = row.date_start
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          link_clicks: 0,
          purchases: 0,
          purchase_values: 0,
          conversions: 0,
          conversion_values: 0,
        }
      }
      
      dailyData[date].spend += parseFloat(row.spend?.toString() || '0')
      dailyData[date].impressions += parseInt(row.impressions?.toString() || '0')
      dailyData[date].clicks += parseInt(row.clicks?.toString() || '0')
      dailyData[date].link_clicks += parseInt(row.link_clicks?.toString() || '0')
      dailyData[date].purchases += parseFloat(row.purchases?.toString() || '0')
      dailyData[date].purchase_values += parseFloat(row.purchase_values?.toString() || '0')
      dailyData[date].conversions += parseFloat(row.conversions?.toString() || '0')
      dailyData[date].conversion_values += parseFloat(row.conversion_values?.toString() || '0')
    })

    // Format daily data with calculated metrics using link_clicks
    const formattedDailyData = Object.values(dailyData).map((day: any) => ({
      date: day.date,
      spend: Math.round(day.spend * 100) / 100,
      impressions: day.impressions,
      clicks: day.clicks,
      link_clicks: day.link_clicks,
      purchases: Math.round(day.purchases * 100) / 100,
      purchase_values: Math.round(day.purchase_values * 100) / 100,
      conversions: Math.round(day.conversions * 100) / 100,
      conversion_values: Math.round(day.conversion_values * 100) / 100,
      // Use link_clicks for CTR/CPC calculations to match Meta Ads Manager
      ctr: day.impressions > 0 && day.link_clicks > 0 ? Math.round((day.link_clicks / day.impressions * 100) * 100) / 100 : 0,
      cpc: day.link_clicks > 0 ? Math.round((day.spend / day.link_clicks) * 100) / 100 : 0,
      roas: day.spend > 0 ? Math.round((day.conversion_values / day.spend) * 100) / 100 : 0,
      purchase_cpa: day.purchases > 0 ? Math.round((day.spend / day.purchases) * 100) / 100 : 0,
      purchase_roas: day.spend > 0 ? Math.round((day.purchase_values / day.spend) * 100) / 100 : 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      summary: {
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalImpressions,
        totalClicks,
        totalLinkClicks,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalPurchaseValues: Math.round(totalPurchaseValues * 100) / 100,
        totalConversions: Math.round(totalConversions * 100) / 100,
        totalConversionValue: Math.round(totalConversionValue * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
        avgCPC: Math.round(avgCPC * 100) / 100,
        avgROAS: Math.round(avgROAS * 100) / 100,
        purchaseCPA: Math.round(purchaseCPA * 100) / 100,
        purchaseROAS: Math.round(purchaseROAS * 100) / 100,
      },
      dailyData: formattedDailyData,
      period: { days, period, dateStart, dateEnd }
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}