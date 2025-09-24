'use client'

import { useState } from 'react'
import { PlusIcon, TrashIcon, PencilIcon, KeyIcon } from '@heroicons/react/24/outline'

interface AccountFormData {
  clientName: string
  metaAccountId: string
  accessToken: string
  timezone: string
  currency: string
  businessName?: string
  contactEmail?: string
  contactName?: string
}

export function AccountManagement() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formData, setFormData] = useState<AccountFormData>({
    clientName: '',
    metaAccountId: '',
    accessToken: '',
    timezone: 'America/New_York',
    currency: 'USD',
    businessName: '',
    contactEmail: '',
    contactName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingAccount 
        ? '/api/accounts' 
        : '/api/accounts'
      
      const method = editingAccount ? 'PUT' : 'POST'
      
      const body = editingAccount 
        ? { ...formData, id: editingAccount.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // Reset form
        setFormData({
          clientName: '',
          metaAccountId: '',
          accessToken: '',
          timezone: 'America/New_York',
          currency: 'USD',
          businessName: '',
          contactEmail: '',
          contactName: '',
        })
        setShowAddForm(false)
        setEditingAccount(null)
        
        // Refresh accounts list
        await fetchAccounts()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Failed to save account')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return
    }

    try {
      const response = await fetch(`/api/accounts?id=${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchAccounts()
      } else {
        alert('Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Account</span>
        </button>
      </div>

      {(showAddForm || editingAccount) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingAccount ? 'Edit Account' : 'Add New Account'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Account ID *
              </label>
              <input
                type="text"
                required
                value={formData.metaAccountId}
                onChange={(e) => setFormData({ ...formData, metaAccountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="act_123456789"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required={!editingAccount}
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingAccount ? 'Leave blank to keep current token' : 'Enter access token'}
                />
                <KeyIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEditingAccount(null)
                setFormData({
                  clientName: '',
                  metaAccountId: '',
                  accessToken: '',
                  timezone: 'America/New_York',
                  currency: 'USD',
                  businessName: '',
                  contactEmail: '',
                  contactName: '',
                })
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingAccount ? 'Update' : 'Add Account'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div>
              <h3 className="font-semibold text-gray-900">{account.clientName}</h3>
              <p className="text-sm text-gray-500">
                {account.metaAccountId} • {account.currency} • {account.timezone}
              </p>
              {account.lastSyncAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Last sync: {new Date(account.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setEditingAccount(account)
                  setFormData({
                    clientName: account.clientName,
                    metaAccountId: account.metaAccountId,
                    accessToken: '',
                    timezone: account.timezone,
                    currency: account.currency,
                    businessName: account.businessName || '',
                    contactEmail: account.contactEmail || '',
                    contactName: account.contactName || '',
                  })
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !showAddForm && (
        <p className="text-center text-gray-500 py-8">
          No accounts configured. Click &ldquo;Add Account&rdquo; to get started.
        </p>
      )}
    </div>
  )
}