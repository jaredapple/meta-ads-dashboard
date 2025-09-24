'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CampaignDrillDownProps {
  campaignId: string | null
  campaignName: string
  isOpen: boolean
  onClose: () => void
  dateRange: number
}

interface AdSet {
  id: string
  name: string
  status: string
  total_spend: number
  total_impressions: number
  total_link_clicks: number
  avg_ctr: number
  avg_cpc: number
  active_ads: number
}

interface Ad {
  id: string
  name: string
  status: string
  total_spend: number
  total_impressions: number
  total_link_clicks: number
  ctr: number
  cpc: number
  purchases: number
  purchase_cpa: number
}

export function CampaignDrillDown({ campaignId, campaignName, isOpen, onClose, dateRange }: CampaignDrillDownProps) {
  const [view, setView] = useState<'adsets' | 'ads'>('adsets')
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null)
  const [selectedAdSetName, setSelectedAdSetName] = useState<string>('')
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAdSets = useCallback(async () => {
    if (!campaignId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/adsets?days=${dateRange}`)
      const data = await response.json()
      setAdSets(data.adsets || [])
    } catch (error) {
      console.error('Error fetching ad sets:', error)
    } finally {
      setLoading(false)
    }
  }, [campaignId, dateRange])

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchAdSets()
    }
  }, [isOpen, campaignId, dateRange, fetchAdSets])

  const fetchAds = async (adSetId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/adsets/${adSetId}/ads?days=${dateRange}`)
      const data = await response.json()
      setAds(data.ads || [])
      setView('ads')
    } catch (error) {
      console.error('Error fetching ads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdSetClick = (adSet: AdSet) => {
    setSelectedAdSetId(adSet.id)
    setSelectedAdSetName(adSet.name)
    fetchAds(adSet.id)
  }

  const handleBackToAdSets = () => {
    setView('adsets')
    setSelectedAdSetId(null)
    setAds([])
  }

  const handleClose = () => {
    setView('adsets')
    setSelectedAdSetId(null)
    setAds([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {view === 'adsets' ? `Ad Sets in ${campaignName}` : `Ads in ${selectedAdSetName}`}
              </CardTitle>
              <CardDescription>
                {view === 'adsets' 
                  ? `Performance breakdown by ad set (Last ${dateRange} days)`
                  : `Individual ad performance (Last ${dateRange} days)`
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {view === 'ads' && (
                <button
                  onClick={handleBackToAdSets}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  ← Back to Ad Sets
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="p-6">
                {view === 'adsets' ? (
                  <div className="space-y-4">
                    {adSets.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No ad sets found for this campaign</p>
                    ) : (
                      adSets.map((adSet) => (
                        <div
                          key={adSet.id}
                          onClick={() => handleAdSetClick(adSet)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{adSet.name}</h4>
                              <p className="text-sm text-gray-500">
                                {adSet.status} • {adSet.active_ads} active ads
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {adSet.total_impressions?.toLocaleString() || '0'} impressions • 
                                {adSet.total_link_clicks?.toLocaleString() || '0'} link clicks
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                ${adSet.total_spend?.toFixed(2) || '0.00'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {adSet.avg_ctr?.toFixed(2) || '0.00'}% CTR
                              </p>
                              <p className="text-xs text-gray-400">
                                ${adSet.avg_cpc?.toFixed(2) || '0.00'} CPC
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ads.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No ads found for this ad set</p>
                    ) : (
                      ads.map((ad) => (
                        <div
                          key={ad.id}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{ad.name}</h4>
                              <p className="text-sm text-gray-500">{ad.status}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {ad.total_impressions?.toLocaleString() || '0'} impressions • 
                                {ad.total_link_clicks?.toLocaleString() || '0'} link clicks • 
                                {ad.purchases?.toFixed(0) || '0'} purchases
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                ${ad.total_spend?.toFixed(2) || '0.00'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {ad.ctr?.toFixed(2) || '0.00'}% CTR
                              </p>
                              <p className="text-xs text-gray-400">
                                ${ad.cpc?.toFixed(2) || '0.00'} CPC • ${ad.purchase_cpa?.toFixed(2) || '0.00'} CPA
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}