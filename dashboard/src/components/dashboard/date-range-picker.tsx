'use client'

import { useState } from 'react'
import { useAccount } from '@/contexts/account-context'

interface DateRangePickerProps {
  onRangeChange?: (days: number, period?: string) => void // Make optional since we can use context
  currentDays?: number // Make optional
  currentPeriod?: string // Make optional
}

export function DateRangePicker({ onRangeChange, currentDays, currentPeriod }: DateRangePickerProps) {
  const { dateRange, setDateRange, period, setPeriod } = useAccount()
  
  // Use context values if props not provided
  const selectedRange = currentDays ?? dateRange
  const selectedPeriod = currentPeriod ?? period

  const dateRanges = [
    { label: 'Today', value: 1, period: 'today' },
    { label: 'Yesterday', value: 1, period: 'yesterday' },
    { label: 'Last 7 days', value: 7, period: 'last_n_days' },
    { label: 'Last 14 days', value: 14, period: 'last_n_days' },
    { label: 'Last 30 days', value: 30, period: 'last_n_days' },
    { label: 'Last 60 days', value: 60, period: 'last_n_days' },
    { label: 'Last 90 days', value: 90, period: 'last_n_days' },
  ]

  const handleRangeChange = (days: number, period: string) => {
    // Update context
    setDateRange(days)
    setPeriod(period)
    
    // Call prop callback if provided (for backward compatibility)
    if (onRangeChange) {
      onRangeChange(days, period)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Time Period:</span>
      <div className="flex space-x-1">
        {dateRanges.map((range) => (
          <button
            key={`${range.period}-${range.value}`}
            onClick={() => handleRangeChange(range.value, range.period)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedRange === range.value && selectedPeriod === range.period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  )
}