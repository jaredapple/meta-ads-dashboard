const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://pkuopepyqmuuklchxmim.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdW9wZXB5cW11dWtsY2h4bWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyOTA5NjQsImV4cCI6MjA3MDg2Njk2NH0.7X9-aIS9Ay711WFvgcAa6Fjz4I8ETgZ85mBdJS97hz0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedSampleData() {
  console.log('🌱 Seeding sample data for dashboard...')

  try {
    // 1. Insert sample account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .upsert({
        id: '183121914746855',
        name: 'Aura House',
        currency: 'USD',
        timezone: 'America/New_York'
      })
      .select()

    if (accountError) {
      console.error('Account error:', accountError)
    } else {
      console.log('✅ Account inserted:', account[0]?.name)
    }

    // 2. Insert sample campaigns
    const campaigns = [
      {
        id: 'camp_001',
        account_id: '183121914746855',
        name: 'Summer Sale Campaign',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        daily_budget: 100.00,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      },
      {
        id: 'camp_002', 
        account_id: '183121914746855',
        name: 'Brand Awareness Drive',
        objective: 'OUTCOME_AWARENESS',
        status: 'ACTIVE',
        daily_budget: 150.00,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      },
      {
        id: 'camp_003',
        account_id: '183121914746855', 
        name: 'Retargeting Campaign',
        objective: 'OUTCOME_SALES',
        status: 'PAUSED',
        daily_budget: 75.00,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      }
    ]

    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .upsert(campaigns)
      .select()

    if (campaignError) {
      console.error('Campaign error:', campaignError)
    } else {
      console.log('✅ Campaigns inserted:', campaignData.length)
    }

    // 3. Insert sample ad sets first (required for ads and insights)
    const adSets = []
    campaigns.forEach(campaign => {
      adSets.push({
        id: `adset_${campaign.id}_001`,
        campaign_id: campaign.id,
        account_id: '183121914746855',
        name: `${campaign.name} - Ad Set 1`,
        status: campaign.status,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      })
    })

    const { data: adSetsData, error: adSetsError } = await supabase
      .from('ad_sets')
      .upsert(adSets)
      .select()

    if (adSetsError) {
      console.error('Ad Sets error:', adSetsError)
    } else {
      console.log('✅ Ad Sets inserted:', adSetsData.length)
    }

    // 5. Insert sample ads
    const ads = []
    campaigns.forEach(campaign => {
      ads.push({
        id: `ad_${campaign.id}_001`,
        ad_set_id: `adset_${campaign.id}_001`,
        campaign_id: campaign.id,
        account_id: '183121914746855',
        name: `${campaign.name} - Ad 1`,
        status: campaign.status,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString()
      })
    })

    const { data: adsData, error: adsError } = await supabase
      .from('ads')
      .upsert(ads)
      .select()

    if (adsError) {
      console.error('Ads error:', adsError)
    } else {
      console.log('✅ Ads inserted:', adsData.length)
    }

    // 6. Insert sample insights for the last 7 days (after all dependencies are created)
    const insights = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Generate realistic sample data
      campaigns.forEach((campaign, campaignIndex) => {
        const baseSpend = campaign.daily_budget * (0.6 + Math.random() * 0.8) // 60-140% of daily budget
        const impressions = Math.floor(baseSpend * (800 + Math.random() * 400)) // ~800-1200 impressions per dollar
        const clicks = Math.floor(impressions * (0.015 + Math.random() * 0.01)) // 1.5-2.5% CTR
        const linkClicks = Math.floor(clicks * (0.7 + Math.random() * 0.2)) // 70-90% of clicks are link clicks
        const purchases = campaign.objective === 'OUTCOME_SALES' ? Math.floor(linkClicks * (0.02 + Math.random() * 0.03)) : 0 // 2-5% conversion rate
        const purchaseValues = purchases * (25 + Math.random() * 50) // $25-75 average order value
        
        insights.push({
          date_start: dateStr,
          account_id: '183121914746855',
          campaign_id: campaign.id,
          ad_set_id: `adset_${campaign.id}_001`,
          ad_id: `ad_${campaign.id}_001`,
          impressions: impressions,
          clicks: clicks,
          spend: Math.round(baseSpend * 100) / 100,
          reach: Math.floor(impressions * (0.7 + Math.random() * 0.2)),
          frequency: Math.round((1 + Math.random() * 0.5) * 100) / 100,
          link_clicks: linkClicks,
          purchases: purchases,
          purchase_values: Math.round(purchaseValues * 100) / 100,
          conversions: purchases,
          conversion_values: purchaseValues,
          video_views: Math.floor(impressions * (0.3 + Math.random() * 0.2)),
          video_thruplay_watched_actions: Math.floor(impressions * (0.15 + Math.random() * 0.1)),
          video_15_sec_watched_actions: Math.floor(impressions * (0.08 + Math.random() * 0.05)),
          video_p100_watched_actions: Math.floor(impressions * (0.12 + Math.random() * 0.08))
        })
      })
    }

    const { data: insightsData, error: insightsError } = await supabase
      .from('daily_ad_insights')
      .upsert(insights)
      .select()

    if (insightsError) {
      console.error('Insights error:', insightsError)
    } else {
      console.log('✅ Insights inserted:', insightsData.length)
    }

    console.log('\n🎉 Sample data seeded successfully!')
    console.log('📊 Dashboard should now show data at http://localhost:3000')
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
  }
}

seedSampleData()
