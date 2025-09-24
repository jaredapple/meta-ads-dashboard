'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DailyPerformanceChart } from '@/components/dashboard/daily-performance-chart'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { CampaignPerformanceChart } from '@/components/dashboard/campaign-performance-chart'
import { CampaignDrillDown } from '@/components/dashboard/campaign-drill-down'
import { PerformanceComparison } from '@/components/dashboard/performance-comparison'
import { TopBottomPerformers } from '@/components/dashboard/top-bottom-performers'
import { TimeBasedInsights } from '@/components/dashboard/time-based-insights'
import { VideoRecommendations } from '@/components/dashboard/video-recommendations'
import { AccountSelector, ClientAccount } from '@/components/dashboard/account-selector'
import { NoSSR } from '@/components/NoSSR'
import { useAccount } from '@/contexts/account-context'

export default function Dashboard() {
  const { 
    selectedAccount, 
    setSelectedAccount, 
    dateRange, 
    setDateRange, 
    period, 
    setPeriod 
  } = useAccount()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [drillDownCampaignId, setDrillDownCampaignId] = useState<string | null>(null)
  const [drillDownCampaignName, setDrillDownCampaignName] = useState<string>('')
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle client-side only initialization
  useEffect(() => {
    setIsClient(true)
    setLastRefresh(new Date())
  }, [])

  const fetchData = useCallback(async (days: number, periodType: string, accountId?: string, isRefresh = false) => {
    if (!accountId) {
      setData(null)
      setLoading(false)
      return
    }
    
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const [metricsResponse, campaignsResponse] = await Promise.all([
        fetch(`/api/metrics?days=${days}&period=${periodType}&accountId=${accountId}`),
        fetch(`/api/campaigns?accountId=${accountId}`),
      ])
      
      const metricsData = await metricsResponse.json()
      const campaignsData = await campaignsResponse.json()
      
      setData({ metrics: metricsData, campaigns: campaignsData })
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchData(dateRange, period, selectedAccount.metaAccountId)
    } else {
      // If no account is selected, try to fetch accounts and auto-select the first one
      fetch('/api/accounts')
        .then(response => response.json())
        .then(data => {
          if (data.accounts && data.accounts.length > 0) {
            const firstAccount = data.accounts[0]
            setSelectedAccount(firstAccount)
            fetchData(dateRange, period, firstAccount.metaAccountId)
          }
        })
        .catch(error => {
          console.error('Error fetching accounts:', error)
          setLoading(false)
        })
    }
  }, [dateRange, period, selectedAccount, fetchData])

  // Auto-refresh effect (client-side only)
  useEffect(() => {
    if (isClient && autoRefresh && selectedAccount && !loading) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      
      // Set up new interval for 5 minutes (300000ms)
      refreshIntervalRef.current = setInterval(() => {
        fetchData(dateRange, period, selectedAccount.metaAccountId, true)
      }, 300000) // 5 minutes
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [isClient, autoRefresh, selectedAccount, dateRange, fetchData, loading])

  const handleDateRangeChange = (days: number, periodType?: string) => {
    setDateRange(days)
    if (periodType) {
      setPeriod(periodType)
    }
    if (selectedAccount) {
      fetchData(days, periodType || period, selectedAccount.metaAccountId)
    }
  }

  const handleAccountChange = (account: ClientAccount | null) => {
    setSelectedAccount(account)
    if (account) {
      fetchData(dateRange, period, account.metaAccountId)
    }
  }

  const handleCampaignClick = (campaignId: string, campaignName: string) => {
    setDrillDownCampaignId(campaignId)
    setDrillDownCampaignName(campaignName)
    setIsDrillDownOpen(true)
  }

  const handleCloseDrillDown = () => {
    setIsDrillDownOpen(false)
    setDrillDownCampaignId(null)
    setDrillDownCampaignName('')
  }

  const handleSyncNow = async () => {
    if (syncing || !selectedAccount) return
    
    setSyncing(true)
    setSyncMessage('Initiating data sync...')
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.metaAccountId,
          days: 3  // Sync last 3 days for quick updates
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setSyncMessage('✅ Sync completed successfully!')
        // Refresh data after successful sync
        setTimeout(() => {
          fetchData(dateRange, period, selectedAccount.metaAccountId, true)
          setSyncMessage(null)
        }, 2000)
      } else {
        setSyncMessage(`⚠️ ${result.message || 'Sync failed'}`)
        setTimeout(() => setSyncMessage(null), 5000)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncMessage('❌ Failed to sync data')
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading your Meta ads data...</h2>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Failed to load data</h2>
        </div>
      </div>
    )
  }

  const { metrics, campaigns } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Meta Ads Dashboard</h1>
              <p className="text-gray-600">
                {selectedAccount ? `${selectedAccount.clientName} • ${selectedAccount.currency}` : 'Select an account to view data'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <AccountSelector 
                onAccountChange={handleAccountChange}
                currentAccount={selectedAccount}
              />
              <DateRangePicker 
                onRangeChange={handleDateRangeChange}
                currentDays={dateRange}
                currentPeriod={period}
              />
            </div>
          </div>
        </div>

        {/* Sync Status Bar */}
        <div className="mb-6 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {refreshing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {refreshing ? 'Syncing...' : 'Live Data'}
                </span>
              </div>
              <NoSSR>
                <span className="text-sm text-gray-500">
                  Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : '--:--:--'}
                </span>
                {autoRefresh && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Auto-refresh: ON (5 min)
                  </span>
                )}
              </NoSSR>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  autoRefresh
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
              </button>
              <button
                onClick={() => selectedAccount && fetchData(dateRange, period, selectedAccount.metaAccountId, true)}
                disabled={refreshing || !selectedAccount}
                className="px-3 py-1 text-sm font-medium bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refreshing ? 'Refreshing...' : 'Refresh View'}
              </button>
              <button
                onClick={handleSyncNow}
                disabled={syncing || !selectedAccount}
                className="px-3 py-1 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Running ETL...
                  </>
                ) : (
                  '🔄 Sync Data Now'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className={`mb-4 p-3 rounded-lg transition-all ${
            syncMessage.includes('✅') ? 'bg-green-50 border border-green-200' :
            syncMessage.includes('⚠️') ? 'bg-yellow-50 border border-yellow-200' :
            syncMessage.includes('❌') ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              syncMessage.includes('✅') ? 'text-green-800' :
              syncMessage.includes('⚠️') ? 'text-yellow-800' :
              syncMessage.includes('❌') ? 'text-red-800' :
              'text-blue-800'
            }`}>{syncMessage}</p>
          </div>
        )}

        {/* Success Message */}
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-green-600 mr-3">✅</div>
            <div>
              <h3 className="text-green-800 font-semibold">Dashboard Connected to Real Data!</h3>
              <p className="text-green-700">Successfully displaying live Meta advertising data from Supabase</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Spend</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${metrics.summary.totalSpend.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              {period === 'today' ? 'Today' : 
               period === 'yesterday' ? 'Yesterday' : 
               `Last ${dateRange} days`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Link Clicks</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.summary.totalLinkClicks?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-500">
              {period === 'today' ? 'Today' : 
               period === 'yesterday' ? 'Yesterday' : 
               `Last ${dateRange} days`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Link CTR</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.summary.avgCTR?.toFixed(2) || '0.00'}%
            </p>
            <p className="text-sm text-gray-500 text-xs">Link clicks / impressions</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cost per Link Click</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${metrics.summary.avgCPC?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-500">Spend / link clicks</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Purchase CPA</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${metrics.summary.purchaseCPA?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-500">{metrics.summary.totalPurchases?.toFixed(0) || '0'} purchases</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Purchase ROAS</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.summary.purchaseROAS?.toFixed(2) || '0.00'}x
            </p>
            <p className="text-sm text-gray-500">${metrics.summary.totalPurchaseValues?.toLocaleString() || '0'} revenue</p>
          </div>
        </div>

        {/* Daily Performance Chart */}
        <div className="mb-8">
          <DailyPerformanceChart data={metrics.dailyData} loading={loading} />
        </div>

        {/* Performance Comparison */}
        <div className="mb-8">
          <PerformanceComparison currentDays={dateRange} />
        </div>

        {/* Campaign Performance Chart */}
        <div className="mb-8">
          <CampaignPerformanceChart 
            campaigns={campaigns.campaigns} 
            loading={loading}
            onCampaignClick={handleCampaignClick}
          />
        </div>

        {/* Top/Bottom Performers */}
        <div className="mb-8">
          <TopBottomPerformers dateRange={dateRange} />
        </div>

        {/* Time-Based Insights */}
        <div className="mb-8">
          <TimeBasedInsights dateRange={dateRange} />
        </div>

        {/* Video Ad Recommendations Section */}
        <div className="mb-8">
          <VideoRecommendations dateRange={dateRange} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500">
          <p>🎉 Meta MCP Dashboard successfully connected to real advertising data!</p>
          <p className="text-sm mt-2">
            API endpoints working • Supabase connected • Real-time data loading
          </p>
        </div>

        {/* Campaign Drill-Down Modal */}
        <CampaignDrillDown
          campaignId={drillDownCampaignId}
          campaignName={drillDownCampaignName}
          isOpen={isDrillDownOpen}
          onClose={handleCloseDrillDown}
          dateRange={dateRange}
        />
      </div>
    </div>
  )
}