'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts'

interface ROASSpendCorrelationProps {
  dateRange: number
}

interface ScatterDataPoint {
  id: string
  name: string
  type: 'campaign' | 'ad'
  spend: number
  roas: number
  purchases: number
  efficiency_score: number
}

interface CorrelationData {
  data_points: ScatterDataPoint[]
  correlation_coefficient: number
  avg_roas: number
  avg_spend: number
  total_campaigns: number
  total_ads: number
}

export function ROASSpendCorrelation({ dateRange }: ROASSpendCorrelationProps) {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'campaigns' | 'ads' | 'both'>('both')

  useEffect(() => {
    fetchCorrelationData()
  }, [dateRange])

  const fetchCorrelationData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/correlation?days=${dateRange}`)
      const data = await response.json()
      setCorrelationData(data)
    } catch (error) {
      console.error('Error fetching correlation data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROAS vs Spend Correlation</CardTitle>
          <CardDescription>Identify efficiency opportunities in your advertising</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!correlationData || correlationData.data_points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROAS vs Spend Correlation</CardTitle>
          <CardDescription>Identify efficiency opportunities in your advertising</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No correlation data available</p>
        </CardContent>
      </Card>
    )
  }

  // Filter data based on view type
  const filteredData = correlationData.data_points.filter(point => {
    if (viewType === 'campaigns') return point.type === 'campaign'
    if (viewType === 'ads') return point.type === 'ad'
    return true // both
  })

  // Separate campaigns and ads for different colors
  const campaignData = filteredData.filter(p => p.type === 'campaign')
  const adData = filteredData.filter(p => p.type === 'ad')

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600 capitalize">{data.type}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-gray-600">Spend:</span> <span className="font-medium">${data.spend.toFixed(2)}</span></p>
            <p><span className="text-gray-600">ROAS:</span> <span className="font-medium">{data.roas.toFixed(2)}x</span></p>
            <p><span className="text-gray-600">Purchases:</span> <span className="font-medium">{data.purchases.toFixed(0)}</span></p>
            <p><span className="text-gray-600">Efficiency:</span> 
              <span className={`font-medium ml-1 ${
                data.efficiency_score > 75 ? 'text-green-600' : 
                data.efficiency_score > 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.efficiency_score.toFixed(0)}%
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate quadrants
  const avgROAS = correlationData.avg_roas
  const avgSpend = correlationData.avg_spend

  // Efficiency insights
  const highROASLowSpend = filteredData.filter(p => p.roas > avgROAS && p.spend < avgSpend).length
  const highROASHighSpend = filteredData.filter(p => p.roas > avgROAS && p.spend >= avgSpend).length
  const lowROASLowSpend = filteredData.filter(p => p.roas <= avgROAS && p.spend < avgSpend).length
  const lowROASHighSpend = filteredData.filter(p => p.roas <= avgROAS && p.spend >= avgSpend).length

  const getCorrelationInsight = (coefficient: number) => {
    if (coefficient > 0.7) return { text: 'Strong Positive', color: 'text-green-600', desc: 'Higher spend = Higher ROAS' }
    if (coefficient > 0.3) return { text: 'Moderate Positive', color: 'text-blue-600', desc: 'Some spend efficiency' }
    if (coefficient > -0.3) return { text: 'Weak/No Correlation', color: 'text-gray-600', desc: 'Mixed efficiency patterns' }
    if (coefficient > -0.7) return { text: 'Moderate Negative', color: 'text-orange-600', desc: 'Diminishing returns' }
    return { text: 'Strong Negative', color: 'text-red-600', desc: 'Higher spend = Lower ROAS' }
  }

  const correlationInsight = getCorrelationInsight(correlationData.correlation_coefficient)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ROAS vs Spend Correlation</CardTitle>
            <CardDescription>
              Identify efficiency opportunities in your advertising (Last {dateRange} days)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'campaigns' | 'ads' | 'both')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Campaigns & Ads</option>
              <option value="campaigns">Campaigns Only</option>
              <option value="ads">Ads Only</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Scatter Plot */}
          <div className="lg:col-span-3">
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="spend" 
                    name="Spend"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                    label={{ value: 'Spend ($)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="roas" 
                    name="ROAS"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}x`}
                    label={{ value: 'ROAS (x)', angle: -90, position: 'insideLeft' }}
                  />
                  
                  {/* Reference lines for averages */}
                  <ReferenceLine x={avgSpend} stroke="#94a3b8" strokeDasharray="5 5" />
                  <ReferenceLine y={avgROAS} stroke="#94a3b8" strokeDasharray="5 5" />
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Campaign points */}
                  {(viewType === 'campaigns' || viewType === 'both') && (
                    <Scatter
                      name="Campaigns"
                      data={campaignData}
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      stroke="#1d4ed8"
                      strokeWidth={2}
                    />
                  )}
                  
                  {/* Ad points */}
                  {(viewType === 'ads' || viewType === 'both') && (
                    <Scatter
                      name="Ads"
                      data={adData}
                      fill="#10b981"
                      fillOpacity={0.6}
                      stroke="#059669"
                      strokeWidth={2}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quadrant Labels */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="font-medium text-green-700">High ROAS, Low Spend</p>
                <p>Scale Up Opportunities ({highROASLowSpend})</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="font-medium text-blue-700">High ROAS, High Spend</p>
                <p>Top Performers ({highROASHighSpend})</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <p className="font-medium text-yellow-700">Low ROAS, Low Spend</p>
                <p>Test & Optimize ({lowROASLowSpend})</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="font-medium text-red-700">Low ROAS, High Spend</p>
                <p>Reduce/Pause ({lowROASHighSpend})</p>
              </div>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Correlation Analysis</h4>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Correlation Strength</p>
              <p className={`text-lg font-bold ${correlationInsight.color}`}>
                {correlationInsight.text}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {correlationInsight.desc}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                r = {correlationData.correlation_coefficient.toFixed(3)}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Average Metrics</p>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Avg Spend:</span>
                  <span className="font-medium">${avgSpend.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg ROAS:</span>
                  <span className="font-medium">{avgROAS.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Scale Opportunities</p>
              <p className="text-lg font-bold text-green-900">{highROASLowSpend}</p>
              <p className="text-xs text-green-700">
                High ROAS, low spend items to scale up
              </p>
            </div>

            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Optimization Needed</p>
              <p className="text-lg font-bold text-red-900">{lowROASHighSpend}</p>
              <p className="text-xs text-red-700">
                High spend, low ROAS items to review
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Data Points</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Campaigns:</span>
                  <span className="font-medium">{correlationData.total_campaigns}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ads:</span>
                  <span className="font-medium">{correlationData.total_ads}</span>
                </div>
                <div className="flex justify-between border-t border-purple-200 pt-1">
                  <span>Showing:</span>
                  <span className="font-medium">{filteredData.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendations */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600 font-medium">Scale Up: </span>
              <span>Increase budget for high-ROAS, low-spend items</span>
            </div>
            <div>
              <span className="text-red-600 font-medium">Optimize: </span>
              <span>Review/pause high-spend, low-ROAS items</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Maintain: </span>
              <span>Keep successful high-spend, high-ROAS items</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}