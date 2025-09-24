'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'

interface TimeBasedInsightsProps {
  dateRange: number
}

interface DayOfWeekData {
  day: string
  spend: number
  impressions: number
  clicks: number
  purchases: number
  roas: number
  ctr: number
}

interface HourlyData {
  hour: number
  spend: number
  impressions: number
  clicks: number
  purchases: number
  roas: number
  ctr: number
}

interface TimeInsightsData {
  dayOfWeek: DayOfWeekData[]
  hourly: HourlyData[]
  insights: {
    bestDay: string
    worstDay: string
    bestHour: number
    worstHour: number
    peakPerformanceDay: string
    peakPerformanceHour: number
  }
}

export function TimeBasedInsights({ dateRange }: TimeBasedInsightsProps) {
  const [timeData, setTimeData] = useState<TimeInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'day' | 'hour'>('day')

  useEffect(() => {
    fetchTimeInsights()
  }, [dateRange])

  const fetchTimeInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/time-insights?days=${dateRange}`)
      const data = await response.json()
      setTimeData(data)
    } catch (error) {
      console.error('Error fetching time insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time-Based Performance Insights</CardTitle>
          <CardDescription>Discover peak performance periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!timeData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time-Based Performance Insights</CardTitle>
          <CardDescription>Discover peak performance periods</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No time insights data available</p>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">
            {viewType === 'day' ? data.day : `${data.hour}:00`}
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-gray-600">Spend:</span> <span className="font-medium text-gray-900">${data.spend.toFixed(2)}</span></p>
            <p><span className="text-gray-600">ROAS:</span> <span className="font-medium text-gray-900">{data.roas.toFixed(2)}x</span></p>
            <p><span className="text-gray-600">CTR:</span> <span className="font-medium text-gray-900">{data.ctr.toFixed(2)}%</span></p>
            <p><span className="text-gray-600">Purchases:</span> <span className="font-medium text-gray-900">{data.purchases.toFixed(0)}</span></p>
          </div>
        </div>
      )
    }
    return null
  }

  const chartData = viewType === 'day' ? timeData.dayOfWeek : timeData.hourly

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Time-Based Performance Insights</CardTitle>
            <CardDescription>
              Discover peak performance periods (Last {dateRange} days)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'day' | 'hour')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Day of Week</option>
              <option value="hour">Hour of Day</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart */}
          <div className="lg:col-span-3">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={viewType === 'day' ? 'day' : 'hour'}
                    tick={{ fontSize: 12 }}
                    angle={viewType === 'day' ? -45 : 0}
                    textAnchor={viewType === 'day' ? 'end' : 'middle'}
                    height={viewType === 'day' ? 80 : 60}
                    tickFormatter={viewType === 'hour' ? (value) => `${value}:00` : undefined}
                  />
                  <YAxis 
                    yAxisId="spend"
                    orientation="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                    label={{ value: 'Spend ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="roas"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}x`}
                    label={{ value: 'ROAS (x)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <Bar
                    yAxisId="spend"
                    dataKey="spend"
                    name="Spend"
                    fill="#3b82f6"
                    fillOpacity={0.7}
                  />
                  
                  <Bar
                    yAxisId="roas"
                    dataKey="roas"
                    name="ROAS"
                    fill="#10b981"
                    fillOpacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Performance Insights</h4>
            
            {viewType === 'day' ? (
              <>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Best Day</p>
                  <p className="text-lg font-bold text-green-900">
                    {timeData.insights.bestDay}
                  </p>
                  <p className="text-xs text-green-700">
                    Highest overall performance
                  </p>
                </div>

                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Needs Attention</p>
                  <p className="text-lg font-bold text-red-900">
                    {timeData.insights.worstDay}
                  </p>
                  <p className="text-xs text-red-700">
                    Lowest performance day
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Peak ROAS Day</p>
                  <p className="text-lg font-bold text-blue-900">
                    {timeData.insights.peakPerformanceDay}
                  </p>
                  <p className="text-xs text-blue-700">
                    Best return on ad spend
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Best Hour</p>
                  <p className="text-lg font-bold text-green-900">
                    {timeData.insights.bestHour}:00
                  </p>
                  <p className="text-xs text-green-700">
                    Highest overall performance
                  </p>
                </div>

                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Needs Attention</p>
                  <p className="text-lg font-bold text-red-900">
                    {timeData.insights.worstHour}:00
                  </p>
                  <p className="text-xs text-red-700">
                    Lowest performance hour
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Peak ROAS Hour</p>
                  <p className="text-lg font-bold text-blue-900">
                    {timeData.insights.peakPerformanceHour}:00
                  </p>
                  <p className="text-xs text-blue-700">
                    Best return on ad spend
                  </p>
                </div>
              </>
            )}

            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Data Period</p>
              <p className="text-lg font-bold text-purple-900">{dateRange} days</p>
              <p className="text-xs text-purple-700">
                Analysis timeframe
              </p>
            </div>
          </div>
        </div>

        {/* Optimization Recommendations */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Optimization Recommendations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {viewType === 'day' ? (
              <>
                <div>
                  <span className="text-green-600 font-medium">Scale Up: </span>
                  <span className="text-gray-800">Increase budget allocation for {timeData.insights.bestDay}</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Optimize: </span>
                  <span className="text-gray-800">Review creative strategy for {timeData.insights.worstDay}</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-green-600 font-medium">Peak Hours: </span>
                  <span className="text-gray-800">Increase bids during {timeData.insights.bestHour}:00-{timeData.insights.bestHour + 2}:00</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Low Hours: </span>
                  <span className="text-gray-800">Reduce spend during {timeData.insights.worstHour}:00-{timeData.insights.worstHour + 2}:00</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}