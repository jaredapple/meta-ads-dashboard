'use client'

import { useState, useEffect } from 'react'
import { AccountSelector, ClientAccount } from '@/components/dashboard/account-selector'

export default function SimpleDashboard() {
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Auto-load Aura House data on initial load
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        // Fetch accounts and find Aura House
        const accountsResponse = await fetch('/api/accounts')
        const accountsData = await accountsResponse.json()
        
        const auraHouse = accountsData.accounts?.find((acc: ClientAccount) => 
          acc.clientName === 'Aura House'
        )
        
        if (auraHouse) {
          setSelectedAccount(auraHouse)
          await fetchData(auraHouse.metaAccountId)
        }
      } catch (error) {
        console.error('Error loading default data:', error)
        setLoading(false)
      }
    }
    
    loadDefaultData()
  }, [])

  const handleAccountChange = (account: ClientAccount | null) => {
    console.log('Account changed:', account)
    setSelectedAccount(account)
    
    if (account) {
      fetchData(account.metaAccountId)
    }
  }

  const fetchData = async (accountId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/metrics?days=7&accountId=${accountId}`)
      const metricsData = await response.json()
      setData(metricsData)
      console.log('Fetched data:', metricsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

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
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading metrics...</p>
          </div>
        )}

        {!selectedAccount && !loading && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">Welcome to Your Multi-Account Dashboard</h2>
            <p className="text-gray-500">Select an account from the dropdown above to view metrics</p>
          </div>
        )}

        {selectedAccount && data && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Metrics for {selectedAccount.clientName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold text-blue-800">Total Spend</h3>
                <p className="text-2xl font-bold text-blue-900">
                  ${data.summary?.totalSpend?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <h3 className="font-semibold text-green-800">Total Impressions</h3>
                <p className="text-2xl font-bold text-green-900">
                  {data.summary?.totalImpressions?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <h3 className="font-semibold text-purple-800">Total Clicks</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {data.summary?.totalClicks?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <h3 className="font-semibold text-orange-800">ROAS</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {data.summary?.avgROAS?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Daily Data ({data.dailyData?.length || 0} days)</h3>
              <div className="text-sm text-gray-600">
                Period: {data.period?.dateStart} to {data.period?.dateEnd}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}