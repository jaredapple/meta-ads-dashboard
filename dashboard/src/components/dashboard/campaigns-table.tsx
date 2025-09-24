'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Campaign {
  rank: number
  campaign_id: string
  campaign_name: string
  objective: string
  status: string
  budget_info: {
    daily_budget: number
    lifetime_budget: number
    budget_utilization_percent: number
  }
  performance_metrics: {
    total_spend: number
    total_impressions: number
    total_clicks: number
    total_conversions: number
    total_conversion_value: number
    avg_ctr: number
    avg_cpc: number
    avg_roas: number
  }
  active_ads: number
}

interface CampaignsTableProps {
  campaigns: Campaign[]
  currency?: string
  loading?: boolean
}

export function CampaignsTable({ campaigns, currency = 'USD', loading = false }: CampaignsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Top performing campaigns by spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Top performing campaigns by spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No campaigns found for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'deleted':
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
        <CardDescription>Top performing campaigns by spend</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-sm text-muted-foreground">Rank</th>
                <th className="text-left py-2 font-medium text-sm text-muted-foreground">Campaign</th>
                <th className="text-left py-2 font-medium text-sm text-muted-foreground">Status</th>
                <th className="text-right py-2 font-medium text-sm text-muted-foreground">Spend</th>
                <th className="text-right py-2 font-medium text-sm text-muted-foreground">ROAS</th>
                <th className="text-right py-2 font-medium text-sm text-muted-foreground">CTR</th>
                <th className="text-right py-2 font-medium text-sm text-muted-foreground">Ads</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.campaign_id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="py-3 text-sm font-medium">#{campaign.rank}</td>
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-sm">{campaign.campaign_name}</div>
                      <div className="text-xs text-muted-foreground">{campaign.objective}</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right text-sm font-medium">
                    {formatCurrency(campaign.performance_metrics.total_spend, currency)}
                  </td>
                  <td className="py-3 text-right text-sm">
                    {campaign.performance_metrics.avg_roas.toFixed(2)}x
                  </td>
                  <td className="py-3 text-right text-sm">
                    {formatPercentage(campaign.performance_metrics.avg_ctr)}
                  </td>
                  <td className="py-3 text-right text-sm">
                    {formatNumber(campaign.active_ads)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}