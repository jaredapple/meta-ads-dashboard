'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'

interface CampaignPerformanceChartProps {
  campaigns: Array<{
    id: string
    name: string
    total_spend: number
    total_impressions: number
    avg_ctr: number
    avg_cpc: number
    avg_roas: number
    active_ads: number
  }>
  loading?: boolean
  onCampaignClick?: (campaignId: string, campaignName: string) => void
}

export function CampaignPerformanceChart({ campaigns, loading = false, onCampaignClick }: CampaignPerformanceChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Top campaigns by spend and efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  // Take top 10 campaigns and prepare data for chart
  const chartData = campaigns
    .slice(0, 10)
    .map(campaign => ({
      id: campaign.id,
      name: campaign.name.length > 20 ? 
        campaign.name.substring(0, 20) + '...' : 
        campaign.name,
      fullName: campaign.name,
      spend: campaign.total_spend || 0,
      roas: campaign.avg_roas || 0,
      ctr: campaign.avg_ctr || 0,
      cpc: campaign.avg_cpc || 0,
      active_ads: campaign.active_ads || 0,
      impressions: campaign.total_impressions || 0,
    }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Top campaigns by spend and efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No campaign data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'spend' || name === 'cpc') {
      return [`$${value?.toFixed(2) || '0.00'}`, 
        name === 'spend' ? 'Total Spend' : 'Avg Cost per Link Click']
    }
    if (name === 'ctr') {
      return [`${value?.toFixed(2) || '0.00'}%`, 'Avg Link CTR']
    }
    if (name === 'roas') {
      return [`${value?.toFixed(2) || '0.00'}x`, 'Avg ROAS']
    }
    return [value?.toLocaleString() || '0', 
      name === 'active_ads' ? 'Active Ads' : 'Impressions']
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">Spend: ${data.spend?.toFixed(2) || '0.00'}</p>
            <p className="text-green-600">ROAS: {data.roas?.toFixed(2) || '0.00'}x</p>
            <p className="text-purple-600">Link CTR: {data.ctr?.toFixed(2) || '0.00'}%</p>
            <p className="text-orange-600">Cost per Link Click: ${data.cpc?.toFixed(2) || '0.00'}</p>
            <p className="text-gray-600">Active Ads: {data.active_ads}</p>
            {onCampaignClick && (
              <p className="text-xs text-gray-500 mt-2 font-medium">Click to view ad sets →</p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const handleBarClick = (data: any) => {
    if (onCampaignClick && data) {
      onCampaignClick(data.id, data.fullName)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
        <CardDescription>Top {chartData.length} campaigns by spend with efficiency metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="spend" 
                fill="#2563eb" 
                name="Total Spend"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Campaigns</p>
            <p className="text-lg font-bold text-blue-900">{campaigns.length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Avg ROAS</p>
            <p className="text-lg font-bold text-green-900">
              {(campaigns.reduce((sum, c) => sum + (c.avg_roas || 0), 0) / campaigns.length).toFixed(2)}x
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Avg Link CTR</p>
            <p className="text-lg font-bold text-purple-900">
              {(campaigns.reduce((sum, c) => sum + (c.avg_ctr || 0), 0) / campaigns.length).toFixed(2)}%
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Total Active Ads</p>
            <p className="text-lg font-bold text-gray-900">
              {campaigns.reduce((sum, c) => sum + (c.active_ads || 0), 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}