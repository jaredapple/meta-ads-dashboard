'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Mail, Settings, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'

interface ExportAlertsProps {
  dateRange: number
}

interface AlertConfig {
  id: string
  name: string
  metric: string
  condition: 'above' | 'below'
  threshold: number
  enabled: boolean
  email?: string
}

export function ExportAlerts({ dateRange }: ExportAlertsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv')
  const [alerts, setAlerts] = useState<AlertConfig[]>([
    {
      id: '1',
      name: 'High Spend Alert',
      metric: 'daily_spend',
      condition: 'above',
      threshold: 500,
      enabled: true,
      email: 'admin@example.com'
    },
    {
      id: '2',
      name: 'Low ROAS Alert', 
      metric: 'roas',
      condition: 'below',
      threshold: 2.0,
      enabled: true,
      email: 'admin@example.com'
    },
    {
      id: '3',
      name: 'High CPA Alert',
      metric: 'cpa',
      condition: 'above',
      threshold: 100,
      enabled: false
    }
  ])

  const handleExport = async (type: 'performance' | 'campaigns' | 'insights') => {
    setIsExporting(true)
    try {
      const endpoint = `/api/export/${type}?days=${dateRange}&format=${exportFormat}`
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Handle different export formats
      if (exportFormat === 'json') {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
      } else if (exportFormat === 'csv') {
        const csvText = await response.text()
        const blob = new Blob([csvText], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else if (exportFormat === 'pdf') {
        const pdfBlob = await response.blob()
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.pdf`
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
    ))
  }

  const updateAlertThreshold = (alertId: string, newThreshold: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, threshold: newThreshold } : alert
    ))
  }

  const updateAlertEmail = (alertId: string, newEmail: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, email: newEmail } : alert
    ))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Export Functionality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Export your performance data for external analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Export Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="csv">CSV Spreadsheet</option>
                <option value="json">JSON Data</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Available Exports</h4>
              
              <button
                onClick={() => handleExport('performance')}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Performance Data</p>
                    <p className="text-sm text-gray-500">Daily metrics, spend, ROAS, conversions</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleExport('campaigns')}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Campaign Details</p>
                    <p className="text-sm text-gray-500">Campaign, ad set, and ad performance</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleExport('insights')}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Analytics Insights</p>
                    <p className="text-sm text-gray-500">Funnel, correlation, time-based data</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Generating export...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Performance Alerts
          </CardTitle>
          <CardDescription>
            Get notified when key metrics cross your thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={() => toggleAlert(alert.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{alert.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {alert.metric.replace('_', ' ')} {alert.condition} {alert.threshold}
                        {alert.metric === 'roas' ? 'x' : alert.metric.includes('spend') || alert.metric.includes('cpa') ? '$' : '%'}
                      </p>
                    </div>
                  </div>
                  <Settings className="h-4 w-4 text-gray-400" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Threshold
                    </label>
                    <input
                      type="number"
                      value={alert.threshold}
                      onChange={(e) => updateAlertThreshold(alert.id, parseFloat(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={alert.email || ''}
                      onChange={(e) => updateAlertEmail(alert.id, e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Alert Button */}
            <button
              onClick={() => {
                const newAlert: AlertConfig = {
                  id: Date.now().toString(),
                  name: 'New Alert',
                  metric: 'spend',
                  condition: 'above',
                  threshold: 100,
                  enabled: false
                }
                setAlerts([...alerts, newAlert])
              }}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
              + Add New Alert
            </button>
          </div>

          {/* Alert Status */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">Alert Status</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Active Alerts:</span>
                <span className="font-medium">{alerts.filter(a => a.enabled).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Total Configured:</span>
                <span className="font-medium">{alerts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Last Check:</span>
                <span className="font-medium">5 minutes ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}