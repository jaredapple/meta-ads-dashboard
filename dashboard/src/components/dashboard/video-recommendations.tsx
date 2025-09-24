'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useAccount } from '@/contexts/account-context'

interface VideoRecommendation {
  adId: string
  adName: string
  campaignName: string
  type: 'scale_up' | 'improve_hook' | 'improve_retention' | 'pause' | 'refresh_creative'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  currentMetrics: {
    thumbstopRate: number
    holdRate: number
    completionRate: number
    spend: number
    roas: number
    cvr: number
  }
  potentialImpact?: {
    estimatedReachIncrease?: number
    estimatedConversionIncrease?: number
  }
}

interface Props {
  dateRange: number
}

export function VideoRecommendations({ dateRange }: Props) {
  const { selectedAccount } = useAccount()
  const [recommendations, setRecommendations] = useState<VideoRecommendation[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    if (selectedAccount) {
      fetchRecommendations()
    }
  }, [dateRange, selectedAccount])

  const fetchRecommendations = async () => {
    if (!selectedAccount) {
      setRecommendations([])
      setSummary(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/video-recommendations?days=${dateRange}&accountId=${selectedAccount.metaAccountId}`)
      const data = await response.json()
      
      if (response.ok) {
        setRecommendations(data.recommendations || [])
        setSummary(data.summary)
      } else {
        console.error('Error fetching video recommendations:', data.error)
        setRecommendations([])
        setSummary(null)
      }
    } catch (error) {
      console.error('Error fetching video recommendations:', error)
      setRecommendations([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'scale_up': return '🚀'
      case 'improve_hook': return '🎯'
      case 'improve_retention': return '⏱️'
      case 'pause': return '⏸️'
      case 'refresh_creative': return '🔄'
      default: return '📊'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'scale_up': return 'bg-green-50 border-green-200'
      case 'improve_hook': return 'bg-yellow-50 border-yellow-200'
      case 'improve_retention': return 'bg-orange-50 border-orange-200'
      case 'pause': return 'bg-red-50 border-red-200'
      case 'refresh_creative': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const filteredRecommendations = selectedType === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.type === selectedType)

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Ad Recommendations</h2>
        <p className="text-gray-600 mb-4">
          AI-powered insights based on engagement and conversion performance for video creatives
        </p>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{summary.totalRecommendations}</div>
              <div className="text-sm text-blue-700">Total Recommendations</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-900">{summary.highPriority}</div>
              <div className="text-sm text-red-700">High Priority</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{summary.scalingOpportunities}</div>
              <div className="text-sm text-purple-700">Scaling Opportunities</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({recommendations.length})
          </button>
          <button
            onClick={() => setSelectedType('scale_up')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'scale_up' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚀 Scale Up
          </button>
          <button
            onClick={() => setSelectedType('improve_hook')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'improve_hook' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎯 Improve Hook
          </button>
          <button
            onClick={() => setSelectedType('improve_retention')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'improve_retention' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⏱️ Improve Retention
          </button>
          <button
            onClick={() => setSelectedType('pause')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'pause' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⏸️ Pause
          </button>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No recommendations available for the selected criteria.</p>
          </Card>
        ) : (
          filteredRecommendations.map((rec, index) => (
            <div key={`${rec.adId}-${index}`} className={`border rounded-lg p-6 ${getTypeColor(rec.type)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(rec.type)}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{rec.adName}</p>
                  <p className="text-xs text-gray-500">{rec.campaignName}</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{rec.description}</p>

              {/* Current Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">Thumbstop Rate</div>
                  <div className="text-lg font-semibold text-gray-900">{rec.currentMetrics.thumbstopRate.toFixed(2)}%</div>
                </div>
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">Hold Rate (15s)</div>
                  <div className="text-lg font-semibold text-gray-900">{rec.currentMetrics.holdRate.toFixed(2)}%</div>
                </div>
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">CVR</div>
                  <div className="text-lg font-semibold text-gray-900">{rec.currentMetrics.cvr.toFixed(2)}%</div>
                </div>
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">Conv. Rate</div>
                  <div className="text-lg font-semibold text-gray-900">{rec.currentMetrics.completionRate.toFixed(2)}%</div>
                </div>
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">Spend</div>
                  <div className="text-lg font-semibold text-gray-900">${rec.currentMetrics.spend.toFixed(0)}</div>
                </div>
                <div className="bg-white/50 p-3 rounded">
                  <div className="text-xs text-gray-600">ROAS</div>
                  <div className="text-lg font-semibold text-gray-900">{rec.currentMetrics.roas.toFixed(2)}x</div>
                </div>
              </div>


              {/* Potential Impact */}
              {rec.potentialImpact && (
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  {rec.potentialImpact.estimatedReachIncrease && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      +{rec.potentialImpact.estimatedReachIncrease}% Reach
                    </span>
                  )}
                  {rec.potentialImpact.estimatedConversionIncrease && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      +{rec.potentialImpact.estimatedConversionIncrease}% Conversions
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}