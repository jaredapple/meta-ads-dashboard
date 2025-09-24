export type CampaignObjective = 
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_APP_PROMOTION'
  | 'OUTCOME_SALES';

export type CampaignStatus = 
  | 'ACTIVE'
  | 'PAUSED'
  | 'DELETED'
  | 'ARCHIVED';

export type AdStatus = 
  | 'ACTIVE'
  | 'PAUSED'
  | 'DELETED'
  | 'ARCHIVED'
  | 'PENDING_REVIEW'
  | 'DISAPPROVED'
  | 'PREAPPROVED'
  | 'PENDING_BILLING_INFO'
  | 'CAMPAIGN_PAUSED'
  | 'ADSET_PAUSED';

export interface Account {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  business_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
  created_at: string;
  updated_at: string;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  account_id: string;
  name: string;
  status: CampaignStatus;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_amount?: number;
  optimization_goal?: string;
  billing_event?: string;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  ad_set_id: string;
  campaign_id: string;
  account_id: string;
  name: string;
  status: AdStatus;
  creative_id?: string;
  created_time: string;
  updated_time: string;
  created_at: string;
  updated_at: string;
}

export interface DailyAdInsight {
  id: string;
  date_start: string;
  account_id: string;
  campaign_id: string;
  ad_set_id: string;
  ad_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  frequency?: number;
  // Separate conversion types
  purchases?: number;
  leads?: number;
  registrations?: number;
  add_to_carts?: number;
  // Conversion values by type
  purchase_values?: number;
  lead_values?: number;
  registration_values?: number;
  // Calculated metrics
  ctr: number;
  cpc: number;
  cpm: number;
  purchase_cpa?: number;
  purchase_roas?: number;
  // Legacy fields for backward compatibility
  conversions?: number;
  conversion_values?: number;
  cost_per_conversion?: number;
  roas: number;
  link_clicks?: number;
  video_views?: number;
  video_p25_watched_actions?: number;
  video_p50_watched_actions?: number;
  video_p75_watched_actions?: number;
  video_p100_watched_actions?: number;
  created_at: string;
  updated_at: string;
}

export interface DailyDemographicInsight {
  id: string;
  date_start: string;
  account_id: string;
  campaign_id: string;
  ad_set_id: string;
  ad_id: string;
  age_range?: string;
  gender?: string;
  country_code?: string;
  region?: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  conversions?: number;
  conversion_values?: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  created_at: string;
  updated_at: string;
}

// Meta API Response Types
export interface MetaInsightResponse {
  data: MetaInsight[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  account_id: string;
  campaign_id: string;
  adset_id: string;
  ad_id: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach?: string;
  frequency?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
  video_thruplay_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_15_sec_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_30_sec_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p25_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p50_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p75_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p95_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p100_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_avg_time_watched_actions?: string;
}

// Database schema for TypeScript generation
export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: Omit<Account, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Campaign, 'id' | 'created_at' | 'updated_at'>>;
      };
      ad_sets: {
        Row: AdSet;
        Insert: Omit<AdSet, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AdSet, 'id' | 'created_at' | 'updated_at'>>;
      };
      ads: {
        Row: Ad;
        Insert: Omit<Ad, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Ad, 'id' | 'created_at' | 'updated_at'>>;
      };
      daily_ad_insights: {
        Row: DailyAdInsight;
        Insert: Omit<DailyAdInsight, 'id' | 'purchase_cpa' | 'purchase_roas' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DailyAdInsight, 'id' | 'purchase_cpa' | 'purchase_roas' | 'created_at' | 'updated_at'>>;
      };
      daily_demographic_insights: {
        Row: DailyDemographicInsight;
        Insert: Omit<DailyDemographicInsight, 'id' | 'ctr' | 'cpc' | 'cpm' | 'roas' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DailyDemographicInsight, 'id' | 'ctr' | 'cpc' | 'cpm' | 'roas' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}