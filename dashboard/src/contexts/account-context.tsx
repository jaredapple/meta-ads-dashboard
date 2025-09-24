'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface AccountContextType {
  selectedAccount: ClientAccount | null
  setSelectedAccount: (account: ClientAccount | null) => void
  accounts: ClientAccount[]
  loadingAccounts: boolean
  refreshAccounts: () => Promise<void>
  // Time period context
  dateRange: number
  setDateRange: (days: number) => void
  period: string
  setPeriod: (period: string) => void
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null)
  const [accounts, setAccounts] = useState<ClientAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  // Time period state
  const [dateRange, setDateRange] = useState<number>(7)
  const [period, setPeriod] = useState<string>('last_n_days')

  const refreshAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await fetch('/api/accounts')
      const data = await response.json()
      
      if (data.accounts) {
        setAccounts(data.accounts)
        
        // If no account is selected, select the first one
        if (!selectedAccount && data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0])
        }
        
        // If selected account no longer exists, clear selection
        if (selectedAccount && !data.accounts.find((a: ClientAccount) => a.id === selectedAccount.id)) {
          setSelectedAccount(data.accounts[0] || null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    refreshAccounts()
  }, [])

  // Save selected account to localStorage for persistence
  useEffect(() => {
    if (selectedAccount) {
      localStorage.setItem('selectedAccountId', selectedAccount.id)
    }
  }, [selectedAccount])

  // Restore selected account from localStorage
  useEffect(() => {
    const savedAccountId = localStorage.getItem('selectedAccountId')
    if (savedAccountId && accounts.length > 0) {
      const savedAccount = accounts.find(a => a.id === savedAccountId)
      if (savedAccount) {
        setSelectedAccount(savedAccount)
      }
    }
  }, [accounts])

  return (
    <AccountContext.Provider 
      value={{
        selectedAccount,
        setSelectedAccount,
        accounts,
        loadingAccounts,
        refreshAccounts,
        dateRange,
        setDateRange,
        period,
        setPeriod
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return context
}