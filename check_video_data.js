require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVideoData() {
  console.log('Checking video_ad_insights after ETL sync...\n');
  
  // Check row count
  const { data, error, count } = await supabase
    .from('video_ad_insights')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error checking video_ad_insights table:', error);
    return;
  }

  console.log(`🎬 video_ad_insights table now has ${count || 0} rows`);
  
  if (count > 0) {
    // Show sample with calculated metrics
    const { data: sampleData } = await supabase
      .from('video_ad_insights')
      .select(`
        ad_id,
        impressions,
        video_plays,
        video_thruplay_watched_actions,
        thumbstop_rate,
        hold_rate_15s,
        completion_rate,
        avg_watch_percentage,
        cost_per_thumbstop
      `)
      .limit(3);
      
    console.log('\n📊 Sample records with calculated metrics:');
    sampleData.forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log(`  Ad ID: ${record.ad_id}`);
      console.log(`  Impressions: ${record.impressions}`);
      console.log(`  Video Plays: ${record.video_plays}`);
      console.log(`  ThruPlay Actions: ${record.video_thruplay_watched_actions}`);
      console.log(`  🎯 Thumbstop Rate: ${record.thumbstop_rate}%`);
      console.log(`  ⏱️  Hold Rate (15s): ${record.hold_rate_15s}%`);
      console.log(`  ✅ Completion Rate: ${record.completion_rate}%`);
      console.log(`  📊 Avg Watch %: ${record.avg_watch_percentage}%`);
      console.log(`  💰 Cost Per Thumbstop: $${record.cost_per_thumbstop}`);
    });
  }
}

checkVideoData().catch(console.error);