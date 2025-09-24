'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SpendChartProps {
  data: Array<{
    date: string
    spend: number
    impressions: number
    clicks: number
  }>
  currency?: string
  loading?: boolean
}

export function SpendChart({ data, currency = 'USD', loading = false }: SpendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spend Trend</CardTitle>
          <CardDescription>Advertising spend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spend Trend</CardTitle>
          <CardDescription>Advertising spend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'spend') {
      return [formatCurrency(value, currency), 'Spend']
    }
    return [value?.toLocaleString() || '0', name === 'impressions' ? 'Impressions' : 'Clicks']
  }

  const formatXAxisLabel = (tickItem: string) => {
    return formatDate(tickItem)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spend Trend</CardTitle>
        <CardDescription>Advertising spend over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxisLabel}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, currency)}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="spend" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}