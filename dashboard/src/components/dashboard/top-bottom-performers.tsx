'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccount } from '@/contexts/account-context'

interface TopBottomPerformersProps {
  dateRange: number
}

interface Performer {
  id: string
  name: string
  type: 'campaign' | 'ad'
  total_spend: number
  total_impressions: number
  total_link_clicks: number
  purchases: number
  purchase_values: number
  avg_ctr: number
  avg_cpc: number
  purchase_cpa: number
  purchase_roas: number
}

export function TopBottomPerformers({ dateRange }: TopBottomPerformersProps) {
  const { selectedAccount } = useAccount()
  const [topPerformers, setTopPerformers] = useState<Performer[]>([])
  const [bottomPerformers, setBottomPerformers] = useState<Performer[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'spend' | 'roas' | 'cpa' | 'ctr'>('roas')

  useEffect(() => {
    if (selectedAccount) {
      fetchPerformers()
    }
  }, [dateRange, metric, selectedAccount])

  const fetchPerformers = async () => {
    if (!selectedAccount) {
      setTopPerformers([])
      setBottomPerformers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/performers?days=${dateRange}&metric=${metric}&accountId=${selectedAccount.metaAccountId}`)
      const data = await response.json()
      
      if (response.ok) {
        setTopPerformers(data.top || [])
        setBottomPerformers(data.bottom || [])
      } else {
        console.error('Error fetching performers:', data.error)
        setTopPerformers([])
        setBottomPerformers([])
      }
    } catch (error) {
      console.error('Error fetching performers:', error)
      setTopPerformers([])
      setBottomPerformers([])
    } finally {
      setLoading(false)
    }
  }

  const getMetricValue = (performer: Performer) => {
    switch (metric) {
      case 'spend':
        return performer.total_spend
      case 'roas':
        return performer.purchase_roas
      case 'cpa':
        return performer.purchase_cpa
      case 'ctr':
        return performer.avg_ctr
      default:
        return 0
    }
  }

  const formatMetricValue = (value: number) => {
    switch (metric) {
      case 'spend':
      case 'cpa':
        return `$${value.toFixed(2)}`
      case 'roas':
        return `${value.toFixed(2)}x`
      case 'ctr':
        return `${value.toFixed(2)}%`
      default:
        return value.toString()
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'spend':
        return 'Total Spend'
      case 'roas':
        return 'Purchase ROAS'
      case 'cpa':
        return 'Purchase CPA'
      case 'ctr':
        return 'Link CTR'
      default:
        return 'Metric'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top & Bottom Performers</CardTitle>
          <CardDescription>Best and worst performing campaigns/ads by selected metric</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  const PerformerCard = ({ performer, rank, isTop }: { performer: Performer; rank: number; isTop: boolean }) => (
    <div className={`p-4 border rounded-lg ${isTop ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
              isTop ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {rank}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              performer.type === 'campaign' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {performer.type}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mt-2">{performer.name}</h4>
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            <p>{performer.total_impressions.toLocaleString()} impressions • {performer.total_link_clicks.toLocaleString()} link clicks</p>
            <p>{performer.purchases.toFixed(0)} purchases • ${performer.purchase_values.toFixed(2)} revenue</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isTop ? 'text-green-700' : 'text-red-700'}`}>
            {formatMetricValue(getMetricValue(performer))}
          </p>
          <p className="text-sm text-gray-600">${performer.total_spend.toFixed(2)} spend</p>
          <p className="text-xs text-gray-500">${performer.avg_cpc.toFixed(2)} CPC</p>
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top & Bottom Performers</CardTitle>
            <CardDescription>Best and worst performing campaigns/ads by {getMetricLabel().toLowerCase()}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Rank by:</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'spend' | 'roas' | 'cpa' | 'ctr')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="roas">Purchase ROAS</option>
              <option value="cpa">Purchase CPA (Low = Good)</option>
              <option value="ctr">Link CTR</option>
              <option value="spend">Total Spend</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
              🏆 Top Performers
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Highest {getMetricLabel()})
              </span>
            </h3>
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No top performers found</p>
              ) : (
                topPerformers.slice(0, 5).map((performer, index) => (
                  <PerformerCard 
                    key={performer.id} 
                    performer={performer} 
                    rank={index + 1} 
                    isTop={true}
                  />
                ))
              )}
            </div>
          </div>

          {/* Bottom Performers */}
          <div>
            <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
              ⚠️ Bottom Performers
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Lowest {getMetricLabel()})
              </span>
            </h3>
            <div className="space-y-3">
              {bottomPerformers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No bottom performers found</p>
              ) : (
                bottomPerformers.slice(0, 5).map((performer, index) => (
                  <PerformerCard 
                    key={performer.id} 
                    performer={performer} 
                    rank={index + 1} 
                    isTop={false}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Performance Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Top Avg {getMetricLabel()}: </span>
              <span className="font-medium">
                {topPerformers.length > 0 ? formatMetricValue(getMetricValue(topPerformers[0])) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Performance Gap: </span>
              <span className="font-medium">
                {topPerformers.length > 0 && bottomPerformers.length > 0 ? 
                  `${((getMetricValue(topPerformers[0]) / Math.max(getMetricValue(bottomPerformers[0]), 0.01)) || 0).toFixed(1)}x difference` : 
                  'N/A'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-600">Optimization Potential: </span>
              <span className="font-medium text-blue-600">
                {bottomPerformers.length > 0 ? 'Review bottom performers' : 'All performing well'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}