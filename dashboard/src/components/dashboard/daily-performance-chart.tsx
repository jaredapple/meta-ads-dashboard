'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'

interface DailyPerformanceChartProps {
  data: Array<{
    date: string
    spend: number
    impressions: number
    link_clicks: number
    purchases: number
    ctr: number
    cpc: number
    purchase_cpa: number
  }>
  loading?: boolean
}

export function DailyPerformanceChart({ data, loading = false }: DailyPerformanceChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance Trends</CardTitle>
          <CardDescription>Spend, clicks, and conversions over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance Trends</CardTitle>
          <CardDescription>Spend, clicks, and conversions over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'spend' || name === 'cpc' || name === 'purchase_cpa') {
      return [`$${value?.toFixed(2) || '0.00'}`, 
        name === 'spend' ? 'Spend' : 
        name === 'cpc' ? 'Cost per Link Click' : 
        'Purchase CPA']
    }
    if (name === 'ctr') {
      return [`${value?.toFixed(2) || '0.00'}%`, 'Link CTR']
    }
    return [value?.toLocaleString() || '0', 
      name === 'impressions' ? 'Impressions' : 
      name === 'link_clicks' ? 'Link Clicks' :
      'Purchases']
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Performance Trends</CardTitle>
        <CardDescription>Key metrics over time with link click accuracy</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={formatDate}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="spend"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="clicks"
                orientation="right"
                tick={{ fontSize: 12 }}
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
              <Legend />
              <Line 
                yAxisId="spend"
                type="monotone" 
                dataKey="spend" 
                stroke="#2563eb" 
                strokeWidth={3}
                name="spend"
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
              />
              <Line 
                yAxisId="clicks"
                type="monotone" 
                dataKey="link_clicks" 
                stroke="#059669" 
                strokeWidth={2}
                name="link_clicks"
                dot={{ fill: '#059669', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#059669', strokeWidth: 2 }}
              />
              <Line 
                yAxisId="clicks"
                type="monotone" 
                dataKey="purchases" 
                stroke="#dc2626" 
                strokeWidth={2}
                name="purchases"
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#dc2626', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Avg Daily Spend</p>
            <p className="text-lg font-bold text-blue-900">
              ${(data.reduce((sum, day) => sum + day.spend, 0) / data.length).toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Avg Link CTR</p>
            <p className="text-lg font-bold text-green-900">
              {(data.reduce((sum, day) => sum + (day.ctr || 0), 0) / data.length).toFixed(2)}%
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Total Purchases</p>
            <p className="text-lg font-bold text-red-900">
              {data.reduce((sum, day) => sum + (day.purchases || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}