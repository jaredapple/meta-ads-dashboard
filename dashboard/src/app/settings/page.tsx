'use client'

import { AccountManagement } from '@/components/dashboard/account-management'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your client accounts and configurations</p>
        </div>
        
        <AccountManagement />
      </div>
    </div>
  )
}