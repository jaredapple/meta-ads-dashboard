import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const currentDays = parseInt(searchParams.get('current_days') || '7')
    const previousDays = parseInt(searchParams.get('previous_days') || '7')
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
    
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Get current date in the account's timezone
    const nowInAccountTZ = new Date().toLocaleString("en-US", {timeZone: accountTimezone})
    const today = new Date(nowInAccountTZ)
    
    // Current period end date (yesterday to avoid incomplete data)
    const currentEndDate = new Date(today)
    currentEndDate.setDate(currentEndDate.getDate() - 1)
    
    // Current period start date  
    const currentStartDate = new Date(currentEndDate)
    currentStartDate.setDate(currentStartDate.getDate() - currentDays + 1)
    
    // Previous period end date (day before current period starts)
    const previousEndDate = new Date(currentStartDate)
    previousEndDate.setDate(previousEndDate.getDate() - 1)
    
    // Previous period start date
    const previousStartDate = new Date(previousEndDate)
    previousStartDate.setDate(previousStartDate.getDate() - previousDays + 1)

    const currentDateStart = formatDate(currentStartDate)
    const currentDateEnd = formatDate(currentEndDate)
    const previousDateStart = formatDate(previousStartDate)
    const previousDateEnd = formatDate(previousEndDate)

    // Build query with optional account filter
    let query = supabase
      .from('daily_ad_insights')
      .select(`
        date_start,
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
      .gte('date_start', previousDateStart)
      .lte('date_start', previousDateEnd)
      .order('date_start', { ascending: true })

    // Filter by account if specified
    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data: insights, error } = await query

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
        period: { 
          days: previousDays, 
          dateStart: previousDateStart, 
          dateEnd: previousDateEnd,
          type: 'previous'
        }
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
      period: { 
        days: previousDays, 
        dateStart: previousDateStart, 
        dateEnd: previousDateEnd,
        type: 'previous'
      }
    })
  } catch (error) {
    console.error('Error fetching comparison metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison metrics' },
      { status: 500 }
    )
  }
}