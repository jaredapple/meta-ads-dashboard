import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SpendData {
  date_range: string;
  date_range_description: string;
  currency: string;
  timezone: string;
  summary: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    average_cpc: number;
    average_ctr: number;
  };
  daily_breakdown: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
  }>;
  filters_applied: {
    account_id: string | null;
    campaign_id: string | null;
    ad_set_id: string | null;
  };
}

export interface CampaignPerformanceData {
  date_range: string;
  date_range_description: string;
  currency: string;
  timezone: string;
  summary: {
    total_campaigns: number;
    total_spend: number;
    total_conversions: number;
    total_conversion_value: number;
    average_roas: number;
    active_campaigns: number;
  };
  campaigns: Array<{
    rank: number;
    campaign_id: string;
    campaign_name: string;
    objective: string;
    status: string;
    budget_info: {
      daily_budget: number;
      lifetime_budget: number;
      budget_utilization_percent: number;
    };
    performance_metrics: {
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      total_conversion_value: number;
      avg_ctr: number;
      avg_cpc: number;
      avg_roas: number;
    };
    active_ads: number;
  }>;
}

export interface TrendAnalysisData {
  analysis_type: string;
  primary_metric: string;
  metric_description: string;
  currency: string;
  timezone: string;
  current_period: {
    date_start: string;
    date_end: string;
    description: string;
    formatted_range: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_conversion_value: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_roas: number;
    daily_data: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      conversion_values: number;
      ctr: number;
      cpc: number;
      roas: number;
    }>;
  };
  comparison_period: {
    date_start: string;
    date_end: string;
    description: string;
    formatted_range: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_conversion_value: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_roas: number;
    daily_data: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      conversion_values: number;
      ctr: number;
      cpc: number;
      roas: number;
    }>;
  };
  trends: {
    spend_change: number;
    spend_change_percent: number;
    impressions_change: number;
    impressions_change_percent: number;
    clicks_change: number;
    clicks_change_percent: number;
    conversions_change: number;
    conversions_change_percent: number;
    conversion_value_change: number;
    conversion_value_change_percent: number;
    ctr_change: number;
    ctr_change_percent: number;
    cpc_change: number;
    cpc_change_percent: number;
    roas_change: number;
    roas_change_percent: number;
    primary_metric_change: number;
    primary_metric_change_percent: number;
    trend_direction: 'up' | 'down' | 'stable';
    summary: string;
  };
}

function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateRangeForAPI(dateRange: DateRange): string {
  const start = formatDateForAPI(dateRange.start);
  const end = formatDateForAPI(dateRange.end);
  return `${start},${end}`;
}

export const metaAPI = {
  async getSpendData(
    dateRange: DateRange,
    filters?: { 
      account_id?: string; 
      campaign_id?: string; 
      ad_set_id?: string; 
    }
  ): Promise<SpendData> {
    const params = {
      date_range: formatDateRangeForAPI(dateRange),
      ...filters,
    };
    
    const response = await api.post('/mcp/tools/get_spend', params);
    return response.data;
  },

  async getCampaignPerformance(
    dateRange: DateRange,
    filters?: { 
      account_id?: string; 
      limit?: number; 
    }
  ): Promise<CampaignPerformanceData> {
    const params = {
      date_range: formatDateRangeForAPI(dateRange),
      ...filters,
    };
    
    const response = await api.post('/mcp/tools/campaign_performance', params);
    return response.data;
  },

  async getTrendAnalysis(
    currentPeriod: DateRange,
    comparisonPeriod: DateRange,
    metric: string = 'spend',
    filters?: { 
      account_id?: string; 
      campaign_id?: string; 
      ad_set_id?: string; 
    }
  ): Promise<TrendAnalysisData> {
    const params = {
      current_period: formatDateRangeForAPI(currentPeriod),
      comparison_period: formatDateRangeForAPI(comparisonPeriod),
      metric,
      ...filters,
    };
    
    const response = await api.post('/mcp/tools/trend_analysis', params);
    return response.data;
  },

  async getBestAds(
    dateRange: DateRange,
    metric: 'spend' | 'roas' | 'conversions' | 'ctr' | 'cpc',
    filters?: { 
      account_id?: string; 
      campaign_id?: string; 
      limit?: number;
    }
  ): Promise<unknown> {
    const params = {
      date_range: formatDateRangeForAPI(dateRange),
      metric,
      ...filters,
    };
    
    const response = await api.post('/mcp/tools/best_ad', params);
    return response.data;
  },

  async getRoasData(
    dateRange: DateRange,
    filters?: { 
      account_id?: string; 
      campaign_id?: string; 
      ad_set_id?: string; 
    }
  ): Promise<unknown> {
    const params = {
      date_range: formatDateRangeForAPI(dateRange),
      ...filters,
    };
    
    const response = await api.post('/mcp/tools/get_roas', params);
    return response.data;
  },
};

export default api;