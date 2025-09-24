import { NextResponse } from 'next/server'

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

    // Fetch data from our analytics endpoints
    const baseUrl = request.url.replace('/api/export/insights', '')
    
    const [funnelRes, correlationRes, timeInsightsRes] = await Promise.all([
      fetch(`${baseUrl}/api/funnel?days=${days}`),
      fetch(`${baseUrl}/api/correlation?days=${days}`),
      fetch(`${baseUrl}/api/time-insights?days=${days}`)
    ])

    const [funnelData, correlationData, timeData] = await Promise.all([
      funnelRes.json(),
      correlationRes.json(), 
      timeInsightsRes.json()
    ])

    const analyticsInsights = {
      funnel_analysis: {
        metrics: funnelData.metrics,
        conversion_rates: {
          impression_to_click: funnelData.metrics.impressions > 0 ? 
            (funnelData.metrics.link_clicks / funnelData.metrics.impressions) * 100 : 0,
          click_to_purchase: funnelData.metrics.link_clicks > 0 ? 
            (funnelData.metrics.purchases / funnelData.metrics.link_clicks) * 100 : 0,
          overall_conversion: funnelData.metrics.impressions > 0 ? 
            (funnelData.metrics.purchases / funnelData.metrics.impressions) * 100 : 0
        },
        roi_summary: {
          total_spend: funnelData.metrics.total_spend,
          total_revenue: funnelData.metrics.total_purchase_values,
          roas: funnelData.metrics.total_spend > 0 ? 
            funnelData.metrics.total_purchase_values / funnelData.metrics.total_spend : 0
        }
      },
      
      correlation_analysis: {
        correlation_coefficient: correlationData.correlation_coefficient,
        interpretation: getCorrelationInterpretation(correlationData.correlation_coefficient),
        averages: {
          avg_spend: correlationData.avg_spend,
          avg_roas: correlationData.avg_roas
        },
        efficiency_opportunities: {
          high_roas_low_spend: correlationData.data_points?.filter((p: any) => 
            p.roas > correlationData.avg_roas && p.spend < correlationData.avg_spend).length || 0,
          low_roas_high_spend: correlationData.data_points?.filter((p: any) => 
            p.roas <= correlationData.avg_roas && p.spend >= correlationData.avg_spend).length || 0
        }
      },
      
      time_based_insights: {
        day_of_week_performance: timeData.dayOfWeek,
        hourly_performance: timeData.hourly,
        peak_performance: {
          best_day: timeData.insights?.bestDay,
          best_hour: timeData.insights?.bestHour,
          peak_roas_day: timeData.insights?.peakPerformanceDay,
          peak_roas_hour: timeData.insights?.peakPerformanceHour
        }
      }
    }

    function getCorrelationInterpretation(coefficient: number): string {
      if (coefficient > 0.7) return 'Strong Positive - Higher spend correlates with higher ROAS'
      if (coefficient > 0.3) return 'Moderate Positive - Some efficiency with increased spend'
      if (coefficient > -0.3) return 'Weak/No Correlation - Mixed efficiency patterns'
      if (coefficient > -0.7) return 'Moderate Negative - Diminishing returns with higher spend'
      return 'Strong Negative - Higher spend leads to lower ROAS'
    }

    if (format === 'json') {
      return NextResponse.json({
        export_type: 'analytics_insights',
        date_range: { start: dateStart, end: dateEnd, days },
        generated_at: new Date().toISOString(),
        insights: analyticsInsights
      })
    }

    if (format === 'csv') {
      const csvSections = [
        '# ANALYTICS INSIGHTS EXPORT',
        `# Generated: ${new Date().toISOString()}`,
        `# Date Range: ${dateStart} to ${dateEnd} (${days} days)`,
        '',
        '# FUNNEL ANALYSIS',
        'Metric,Value',
        `Total Impressions,${analyticsInsights.funnel_analysis.metrics.impressions}`,
        `Total Link Clicks,${analyticsInsights.funnel_analysis.metrics.link_clicks}`,
        `Total Purchases,${analyticsInsights.funnel_analysis.metrics.purchases}`,
        `Total Spend,$${analyticsInsights.funnel_analysis.metrics.total_spend}`,
        `Total Revenue,$${analyticsInsights.funnel_analysis.metrics.total_purchase_values}`,
        `Impression to Click Rate,${analyticsInsights.funnel_analysis.conversion_rates.impression_to_click.toFixed(2)}%`,
        `Click to Purchase Rate,${analyticsInsights.funnel_analysis.conversion_rates.click_to_purchase.toFixed(2)}%`,
        `Overall Conversion Rate,${analyticsInsights.funnel_analysis.conversion_rates.overall_conversion.toFixed(4)}%`,
        `ROAS,${analyticsInsights.funnel_analysis.roi_summary.roas.toFixed(2)}x`,
        '',
        '# CORRELATION ANALYSIS',
        'Analysis,Value',
        `Spend vs ROAS Correlation,${analyticsInsights.correlation_analysis.correlation_coefficient.toFixed(3)}`,
        `Interpretation,"${analyticsInsights.correlation_analysis.interpretation}"`,
        `Average Spend,$${analyticsInsights.correlation_analysis.averages.avg_spend.toFixed(2)}`,
        `Average ROAS,${analyticsInsights.correlation_analysis.averages.avg_roas.toFixed(2)}x`,
        `Scale Up Opportunities,${analyticsInsights.correlation_analysis.efficiency_opportunities.high_roas_low_spend}`,
        `Optimization Needed,${analyticsInsights.correlation_analysis.efficiency_opportunities.low_roas_high_spend}`,
        '',
        '# TIME-BASED INSIGHTS',
        'Best Performing Day,' + (analyticsInsights.time_based_insights.peak_performance.best_day || 'N/A'),
        'Best Performing Hour,' + (analyticsInsights.time_based_insights.peak_performance.best_hour || 'N/A'),
        'Peak ROAS Day,' + (analyticsInsights.time_based_insights.peak_performance.peak_roas_day || 'N/A'),
        'Peak ROAS Hour,' + (analyticsInsights.time_based_insights.peak_performance.peak_roas_hour || 'N/A'),
        '',
        '# DAY OF WEEK PERFORMANCE',
        'Day,Spend ($),Impressions,Clicks,Purchases,CTR (%),ROAS (x)',
        ...analyticsInsights.time_based_insights.day_of_week_performance.map((day: any) =>
          `${day.day},${day.spend},${day.impressions},${day.clicks},${day.purchases},${day.ctr},${day.roas}`
        ),
        '',
        '# HOURLY PERFORMANCE (Top 12 Hours)',
        'Hour,Spend ($),Impressions,Clicks,Purchases,CTR (%),ROAS (x)',
        ...analyticsInsights.time_based_insights.hourly_performance
          .sort((a: any, b: any) => b.spend - a.spend)
          .slice(0, 12)
          .map((hour: any) =>
            `${hour.hour}:00,${hour.spend},${hour.impressions},${hour.clicks},${hour.purchases},${hour.ctr},${hour.roas}`
          )
      ]

      return new NextResponse(csvSections.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-insights-${dateStart}-to-${dateEnd}.csv"`
        }
      })
    }

    return NextResponse.json({
      error: 'PDF export not yet implemented. Please use CSV or JSON format.',
      available_formats: ['csv', 'json']
    }, { status: 400 })

  } catch (error) {
    console.error('Error exporting insights data:', error)
    return NextResponse.json(
      { error: 'Failed to export insights data' },
      { status: 500 }
    )
  }
}