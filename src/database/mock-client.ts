// Temporary mock database client for testing with real Meta data
// This replaces Supabase temporarily until we set it up

export interface MockData {
  campaigns: any[];
  insights: any[];
  lastUpdated: Date;
}

class MockDatabaseClient {
  private data: MockData = {
    campaigns: [],
    insights: [],
    lastUpdated: new Date()
  };

  // Store real Meta data
  async storeCampaigns(campaigns: any[]) {
    this.data.campaigns = campaigns;
    this.data.lastUpdated = new Date();
    console.log(`📊 Stored ${campaigns.length} campaigns in mock database`);
  }

  async storeInsights(insights: any[]) {
    this.data.insights = insights;
    this.data.lastUpdated = new Date();
    console.log(`📈 Stored ${insights.length} insights records in mock database`);
  }

  // Mock the Supabase client interface for our data service
  from(table: string) {
    return {
      select: (fields: string) => ({
        gte: (field: string, value: any) => ({
          lte: (field: string, value: any) => ({
            eq: (field: string, value: any) => this.mockQuery(table, fields)
          }),
          then: (callback: Function) => callback(this.mockQuery(table, fields))
        }),
        eq: (field: string, value: any) => ({
          single: () => this.mockQuery(table, fields, true)
        }),
        then: (callback: Function) => callback(this.mockQuery(table, fields))
      }),
      upsert: (data: any, options?: any) => {
        console.log(`💾 Mock upsert to ${table}:`, data);
        return Promise.resolve({ data, error: null });
      }
    };
  }

  private mockQuery(table: string, fields: string, single = false) {
    const result: { data: any, error: null } = { data: [], error: null };
    
    switch (table) {
      case 'daily_ad_insights':
        // Transform real Meta insights to our schema format
        result.data = this.data.insights.map(insight => ({
          date_start: insight.date_start,
          account_id: 'act_183121914746855',
          campaign_id: 'mock_campaign_1',
          ad_set_id: 'mock_adset_1', 
          ad_id: 'mock_ad_1',
          spend: parseFloat(insight.spend || 0),
          impressions: parseInt(insight.impressions || 0),
          clicks: parseInt(insight.clicks || 0),
          conversions: parseFloat(insight.conversions || 0),
          conversion_values: 0, // Will be populated when we get conversion data
        }));
        break;
        
      case 'campaigns':
        result.data = this.data.campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
        }));
        break;
    }

    if (single && result.data.length > 0) {
      result.data = result.data[0];
    }

    return Promise.resolve(result);
  }

  // Mock RPC calls
  rpc(functionName: string, params: any) {
    console.log(`🔧 Mock RPC call: ${functionName}`, params);
    return Promise.resolve({ data: [], error: null });
  }
}

let mockClient: MockDatabaseClient | null = null;

export function getMockSupabaseClient() {
  if (!mockClient) {
    mockClient = new MockDatabaseClient();
  }
  return mockClient;
}

export async function loadRealMetaData() {
  const axios = require('axios');
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const ACCOUNT_ID = process.env.META_ACCOUNT_ID;
  
  console.log('🔄 Loading real Meta data into mock database...');
  
  try {
    // Fetch campaigns
    const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/campaigns`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget',
        limit: 50
      }
    });

    // Fetch insights
    const insightsResponse = await axios.get(`https://graph.facebook.com/v18.0/${ACCOUNT_ID}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'spend,impressions,clicks,conversions,date_start,date_stop',
        date_preset: 'last_30d',
        time_increment: 1
      }
    });

    const client = getMockSupabaseClient();
    await client.storeCampaigns(campaignsResponse.data.data);
    await client.storeInsights(insightsResponse.data.data);
    
    console.log('✅ Real Meta data loaded successfully!');
    return client;
    
  } catch (error) {
    console.error('❌ Failed to load real Meta data:', (error as Error).message);
    throw error;
  }
}