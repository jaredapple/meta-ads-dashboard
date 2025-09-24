'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from 'recharts'
import { useAccount } from '@/contexts/account-context'

interface ConversionFunnelProps {
  dateRange?: number // Make optional since we can get it from context
}

interface FunnelData {
  name: string
  value: number
  fill: string
  description: string
}

interface FunnelMetrics {
  impressions: number
  link_clicks: number
  add_to_carts: number
  leads: number
  purchases: number
  total_spend: number
  total_purchase_values: number
}

export function ConversionFunnel({ dateRange }: ConversionFunnelProps) {
  const { selectedAccount, dateRange: contextDateRange, period } = useAccount()
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // Use context dateRange if dateRange prop not provided
  const effectiveDays = dateRange || contextDateRange

  useEffect(() => {
    if (selectedAccount) {
      fetchFunnelData()
    }
  }, [effectiveDays, selectedAccount, period])

  const fetchFunnelData = async () => {
    if (!selectedAccount) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/funnel?days=${effectiveDays}&accountId=${selectedAccount.metaAccountId}`)
      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Error fetching funnel data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Customer journey from impression to purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Customer journey from impression to purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No funnel data available</p>
        </CardContent>
      </Card>
    )
  }

  // Create funnel data
  const funnelData: FunnelData[] = [
    {
      name: 'Impressions',
      value: metrics.impressions,
      fill: '#3b82f6',
      description: 'People who saw your ads'
    },
    {
      name: 'Link Clicks',
      value: metrics.link_clicks,
      fill: '#10b981',
      description: 'People who clicked your ads'
    },
    {
      name: 'Add to Cart',
      value: metrics.add_to_carts,
      fill: '#f59e0b',
      description: 'People who added items to cart'
    },
    {
      name: 'Leads',
      value: metrics.leads,
      fill: '#8b5cf6',
      description: 'People who became leads'
    },
    {
      name: 'Purchases',
      value: metrics.purchases,
      fill: '#ef4444',
      description: 'People who completed purchases'
    }
  ].filter(item => item.value > 0) // Only show stages with data

  // Calculate conversion rates
  const calculateRate = (current: number, previous: number) => {
    return previous > 0 ? (current / previous) * 100 : 0
  }

  const rates = {
    impressionToClick: calculateRate(metrics.link_clicks, metrics.impressions),
    clickToCart: calculateRate(metrics.add_to_carts, metrics.link_clicks),
    cartToLead: calculateRate(metrics.leads, metrics.add_to_carts),
    leadToPurchase: calculateRate(metrics.purchases, metrics.leads),
    clickToPurchase: calculateRate(metrics.purchases, metrics.link_clicks),
    impressionToPurchase: calculateRate(metrics.purchases, metrics.impressions)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.description}</p>
          <p className="text-lg font-bold" style={{ color: data.fill }}>
            {data.value.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = (props: any) => {
    const { x, y, width, height, value, name } = props
    return (
      <g>
        <text 
          x={x + width / 2} 
          y={y + height / 2 - 10} 
          textAnchor="middle" 
          className="fill-white font-semibold text-sm"
        >
          {name}
        </text>
        <text 
          x={x + width / 2} 
          y={y + height / 2 + 5} 
          textAnchor="middle" 
          className="fill-white text-xs"
        >
          {value.toLocaleString()}
        </text>
      </g>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>
          Customer journey from impression to purchase (Last {dateRange} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funnel Chart */}
          <div className="lg:col-span-2">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive={true}
                  >
                    <LabelList content={<CustomLabel />} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Rates */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Conversion Rates</h4>
            
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Impression → Click</p>
                <p className="text-lg font-bold text-blue-900">
                  {rates.impressionToClick.toFixed(2)}%
                </p>
                <p className="text-xs text-blue-700">
                  {metrics.link_clicks.toLocaleString()} of {metrics.impressions.toLocaleString()}
                </p>
              </div>

              {metrics.add_to_carts > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600 font-medium">Click → Add to Cart</p>
                  <p className="text-lg font-bold text-amber-900">
                    {rates.clickToCart.toFixed(2)}%
                  </p>
                  <p className="text-xs text-amber-700">
                    {metrics.add_to_carts.toLocaleString()} of {metrics.link_clicks.toLocaleString()}
                  </p>
                </div>
              )}

              {metrics.leads > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Cart → Lead</p>
                  <p className="text-lg font-bold text-purple-900">
                    {rates.cartToLead.toFixed(2)}%
                  </p>
                  <p className="text-xs text-purple-700">
                    {metrics.leads.toLocaleString()} of {metrics.add_to_carts.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Click → Purchase</p>
                <p className="text-lg font-bold text-red-900">
                  {rates.clickToPurchase.toFixed(2)}%
                </p>
                <p className="text-xs text-red-700">
                  {metrics.purchases.toLocaleString()} of {metrics.link_clicks.toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">Overall Conversion</p>
                <p className="text-lg font-bold text-gray-900">
                  {rates.impressionToPurchase.toFixed(4)}%
                </p>
                <p className="text-xs text-gray-700">
                  End-to-end conversion rate
                </p>
              </div>
            </div>

            {/* ROI Summary */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h5 className="font-medium text-green-800 mb-2">ROI Summary</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Total Spend:</span>
                  <span className="font-medium">${metrics.total_spend.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Total Revenue:</span>
                  <span className="font-medium">${metrics.total_purchase_values.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-green-200 pt-2">
                  <span className="text-green-600 font-medium">ROAS:</span>
                  <span className="font-bold text-green-800">
                    {metrics.total_spend > 0 ? (metrics.total_purchase_values / metrics.total_spend).toFixed(2) : '0.00'}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Insights */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Optimization Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Biggest Drop-off: </span>
              <span className="font-medium">
                {rates.impressionToClick < 2 ? 'Impression → Click' : 
                 rates.clickToPurchase < 1 ? 'Click → Purchase' : 
                 'Performing Well'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Best Converting Step: </span>
              <span className="font-medium">
                {Math.max(rates.impressionToClick, rates.clickToPurchase) === rates.impressionToClick ? 
                 'Click Rate' : 'Purchase Rate'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Focus Area: </span>
              <span className="font-medium text-blue-600">
                {rates.impressionToClick < 1 ? 'Improve CTR' : 
                 rates.clickToPurchase < 1 ? 'Improve Landing Page' : 
                 'Scale Successful Ads'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}