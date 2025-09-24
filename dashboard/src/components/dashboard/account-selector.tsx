'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, BuildingOfficeIcon, CheckIcon } from '@heroicons/react/24/outline'

export interface ClientAccount {
  id: string
  clientName: string
  metaAccountId: string
  accountName?: string
  businessName?: string
  timezone: string
  currency: string
  lastSyncAt?: string
  syncStatus?: string
}

interface AccountSelectorProps {
  onAccountChange: (account: ClientAccount | null) => void
  currentAccount?: ClientAccount | null
}

export function AccountSelector({ onAccountChange, currentAccount }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<ClientAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(currentAccount || null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    // Set initial account if not already selected
    if (!selectedAccount && accounts.length > 0) {
      const defaultAccount = accounts[0]
      setSelectedAccount(defaultAccount)
      onAccountChange(defaultAccount)
    }
  }, [accounts, selectedAccount, onAccountChange])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts')
      const data = await response.json()
      
      if (data.accounts) {
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountSelect = (account: ClientAccount) => {
    setSelectedAccount(account)
    onAccountChange(account)
    setIsOpen(false)
  }

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'syncing':
        return 'text-blue-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  const getSyncStatusText = (status?: string) => {
    switch (status) {
      case 'success':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'failed':
        return 'Sync Failed'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No accounts configured
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[240px] px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {selectedAccount?.clientName || 'Select Account'}
            </div>
            {selectedAccount && (
              <div className="text-xs text-gray-500">
                {selectedAccount.metaAccountId}
              </div>
            )}
          </div>
        </div>
        <ChevronDownIcon 
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="py-1 max-h-60 overflow-auto">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {account.clientName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {account.metaAccountId} • {account.currency}
                    </div>
                    <div className={`text-xs ${getSyncStatusColor(account.syncStatus)}`}>
                      {getSyncStatusText(account.syncStatus)}
                      {account.lastSyncAt && (
                        <span className="text-gray-400 ml-1">
                          • Last sync: {new Date(account.lastSyncAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedAccount?.id === account.id && (
                  <CheckIcon className="h-5 w-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
          
          {accounts.length > 1 && (
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
              <div className="text-xs text-gray-500">
                {accounts.length} accounts available
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}