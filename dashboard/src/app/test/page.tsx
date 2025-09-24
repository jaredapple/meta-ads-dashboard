'use client'

import { useState, useEffect } from 'react'

export default function TestPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAccounts() {
      try {
        console.log('Fetching accounts...')
        const response = await fetch('/api/accounts')
        const data = await response.json()
        console.log('Accounts data:', data)
        setAccounts(data.accounts || [])
      } catch (err) {
        console.error('Error fetching accounts:', err)
        setError('Failed to fetch accounts')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading test page...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error: {error}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold mb-8">Test Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Accounts ({accounts.length})</h2>
        
        {accounts.length === 0 ? (
          <p className="text-gray-500">No accounts found</p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded p-4">
                <h3 className="font-semibold">{account.clientName}</h3>
                <p className="text-sm text-gray-600">ID: {account.metaAccountId}</p>
                <p className="text-sm text-gray-600">Currency: {account.currency}</p>
                <p className="text-sm text-gray-600">Status: {account.syncStatus}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}