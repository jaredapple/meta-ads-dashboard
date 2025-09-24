'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface MetricCardProps {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percentage'
  currency?: string
  change?: number
  changeType?: 'percentage' | 'absolute'
  period?: string
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  format = 'number',
  currency = 'USD',
  change,
  changeType = 'percentage',
  period,
  loading = false,
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val, currency)
      case 'percentage':
        return formatPercentage(val)
      case 'number':
      default:
        return formatNumber(val)
    }
  }

  const formatChange = (val: number) => {
    if (changeType === 'percentage') {
      return `${val > 0 ? '+' : ''}${formatPercentage(val, 1)}`
    }
    return `${val > 0 ? '+' : ''}${formatNumber(val)}`
  }

  const isPositiveChange = change && change > 0
  const isNegativeChange = change && change < 0

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            {isPositiveChange && (
              <>
                <ArrowUpIcon className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{formatChange(change)}</span>
              </>
            )}
            {isNegativeChange && (
              <>
                <ArrowDownIcon className="h-3 w-3 text-red-500" />
                <span className="text-red-500">{formatChange(Math.abs(change))}</span>
              </>
            )}
            {change === 0 && (
              <span className="text-gray-500">No change</span>
            )}
            {period && <span>from {period}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}