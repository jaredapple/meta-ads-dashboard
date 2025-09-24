import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on our schema
export interface Campaign {
  id: string
  account_id: string
  name: string
  objective: string
  status: string
  daily_budget?: number
  lifetime_budget?: number
  total_spend?: number
  total_impressions?: number
  total_clicks?: number
  total_conversions?: number
  avg_ctr?: number
  avg_cpc?: number
  avg_roas?: number
  active_ads?: number
}

export interface DailyInsight {
  id: string
  date_start: string
  account_id: string
  campaign_id: string
  ad_set_id: string
  ad_id: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversion_values: number
  ctr: number
  cpc: number
  roas: number
}

export interface MetricsSummary {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCTR: number
  avgCPC: number
  avgROAS: number
}