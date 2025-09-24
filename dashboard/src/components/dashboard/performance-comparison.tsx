'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccount } from '@/contexts/account-context'

interface PerformanceComparisonProps {
  currentDays?: number // Make optional since we can get it from context
}

interface PeriodMetrics {
  totalSpend: number
  totalImpressions: number
  totalLinkClicks: number
  totalPurchases: number
  totalPurchaseValues: number
  avgCTR: number
  avgCPC: number
  purchaseCPA: number
  purchaseROAS: number
}

export function PerformanceComparison({ currentDays }: PerformanceComparisonProps) {
  const { selectedAccount, dateRange, period } = useAccount()
  const [currentPeriod, setCurrentPeriod] = useState<PeriodMetrics | null>(null)
  const [previousPeriod, setPreviousPeriod] = useState<PeriodMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // Use context dateRange if currentDays not provided
  const effectiveDays = currentDays || dateRange

  useEffect(() => {
    if (selectedAccount) {
      fetchComparisonData()
    }
  }, [effectiveDays, selectedAccount, period])

  const fetchComparisonData = async () => {
    if (!selectedAccount) return
    
    setLoading(true)
    try {
      // Fetch current period with account and period context
      const currentResponse = await fetch(`/api/metrics?days=${effectiveDays}&period=${period}&accountId=${selectedAccount.metaAccountId}`)
      const currentData = await currentResponse.json()

      // Fetch previous period (same duration, but shifted back)
      const previousResponse = await fetch(`/api/metrics/comparison?current_days=${effectiveDays}&previous_days=${effectiveDays}&accountId=${selectedAccount.metaAccountId}`)
      const previousData = await previousResponse.json()

      setCurrentPeriod(currentData.summary)
      setPreviousPeriod(previousData.summary)
    } catch (error) {
      console.error('Error fetching comparison data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = (current: number, previous: number): { value: number; percentage: number; isPositive: boolean } => {
    if (!previous || previous === 0) {
      return { value: current, percentage: 0, isPositive: current >= 0 }
    }
    
    const change = current - previous
    const percentage = (change / previous) * 100
    return {
      value: change,
      percentage,
      isPositive: change >= 0
    }
  }

  const formatChange = (change: { value: number; percentage: number; isPositive: boolean }, isCurrency = false, isPercentage = false) => {
    const sign = change.isPositive ? '+' : ''
    const prefix = isCurrency ? '$' : ''
    const suffix = isPercentage ? '%' : ''
    
    return {
      value: `${sign}${prefix}${Math.abs(change.value).toFixed(2)}${suffix}`,
      percentage: `${sign}${change.percentage.toFixed(1)}%`,
      color: change.isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: change.isPositive ? 'bg-green-50' : 'bg-red-50',
      borderColor: change.isPositive ? 'border-green-200' : 'border-red-200',
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period-over-Period Comparison</CardTitle>
          <CardDescription>Compare current vs previous {currentDays} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!currentPeriod || !previousPeriod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period-over-Period Comparison</CardTitle>
          <CardDescription>Compare current vs previous {currentDays} days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No comparison data available</p>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    {
      label: 'Total Spend',
      current: currentPeriod.totalSpend,
      previous: previousPeriod.totalSpend,
      isCurrency: true,
      isGoodWhenUp: false
    },
    {
      label: 'Link Clicks',
      current: currentPeriod.totalLinkClicks,
      previous: previousPeriod.totalLinkClicks,
      isGoodWhenUp: true
    },
    {
      label: 'Link CTR',
      current: currentPeriod.avgCTR,
      previous: previousPeriod.avgCTR,
      isPercentage: true,
      isGoodWhenUp: true
    },
    {
      label: 'Cost per Link Click',
      current: currentPeriod.avgCPC,
      previous: previousPeriod.avgCPC,
      isCurrency: true,
      isGoodWhenUp: false
    },
    {
      label: 'Purchases',
      current: currentPeriod.totalPurchases,
      previous: previousPeriod.totalPurchases,
      isGoodWhenUp: true
    },
    {
      label: 'Purchase CPA',
      current: currentPeriod.purchaseCPA,
      previous: previousPeriod.purchaseCPA,
      isCurrency: true,
      isGoodWhenUp: false
    },
    {
      label: 'Purchase ROAS',
      current: currentPeriod.purchaseROAS,
      previous: previousPeriod.purchaseROAS,
      isGoodWhenUp: true,
      suffix: 'x'
    },
    {
      label: 'Purchase Revenue',
      current: currentPeriod.totalPurchaseValues,
      previous: previousPeriod.totalPurchaseValues,
      isCurrency: true,
      isGoodWhenUp: true
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period-over-Period Comparison</CardTitle>
        <CardDescription>
          Current {currentDays} days vs previous {currentDays} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const change = calculateChange(metric.current, metric.previous)
            const formatted = formatChange(change, metric.isCurrency, metric.isPercentage)
            
            // Determine if this change is "good" based on the metric type
            const isGoodChange = metric.isGoodWhenUp ? change.isPositive : !change.isPositive
            const indicatorColor = isGoodChange ? 'text-green-600' : 'text-red-600'
            const indicatorBg = isGoodChange ? 'bg-green-50' : 'bg-red-50'
            
            return (
              <div 
                key={metric.label}
                className={`p-4 border rounded-lg ${formatted.borderColor} ${formatted.bgColor}`}
              >
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{metric.label}</h4>
                  
                  {/* Current Value */}
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {metric.isCurrency && '$'}
                    {metric.current?.toFixed(2) || '0.00'}
                    {metric.suffix}
                    {metric.isPercentage && '%'}
                  </p>
                  
                  {/* Previous Value */}
                  <p className="text-xs text-gray-500 mb-2">
                    vs {metric.isCurrency && '$'}
                    {metric.previous?.toFixed(2) || '0.00'}
                    {metric.suffix}
                    {metric.isPercentage && '%'}
                  </p>
                  
                  {/* Change */}
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${indicatorBg} ${indicatorColor}`}>
                    <span className="mr-1">
                      {isGoodChange ? '↗' : '↘'}
                    </span>
                    {formatted.percentage}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Performance Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Efficiency: </span>
              <span className={calculateChange(currentPeriod.avgCPC, previousPeriod.avgCPC).isPositive ? 'text-red-600' : 'text-green-600'}>
                {calculateChange(currentPeriod.avgCPC, previousPeriod.avgCPC).isPositive ? 'Decreased' : 'Improved'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Conversion Rate: </span>
              <span className={calculateChange(currentPeriod.purchaseROAS, previousPeriod.purchaseROAS).isPositive ? 'text-green-600' : 'text-red-600'}>
                {calculateChange(currentPeriod.purchaseROAS, previousPeriod.purchaseROAS).isPositive ? 'Improved' : 'Decreased'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Overall: </span>
              <span className="font-medium">
                {calculateChange(currentPeriod.totalPurchases, previousPeriod.totalPurchases).isPositive ? '📈 Growing' : '📉 Declining'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}