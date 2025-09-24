#!/usr/bin/env node

// Test script to verify video metrics transformation fixes
require('dotenv').config();

// Import the DataTransformer to test our fixes
const path = require('path');
const tsNode = require('ts-node');

// Configure TypeScript execution
tsNode.register({
  project: path.join(__dirname, 'tsconfig.json'),
});

const { DataTransformer } = require('./src/services/data-transformer');

console.log('🎥 Testing Video Metrics Data Transformation Fixes...\n');

// Mock Meta API insight data based on what we observed
const mockKaylynInsight = {
  date_start: '2025-08-19',
  date_stop: '2025-08-19',
  account_id: '123456789',
  campaign_id: 'test_campaign',
  adset_id: 'test_adset',
  ad_id: '120218148594730014',
  impressions: '2614',
  clicks: '45',
  spend: '125.50',
  reach: '2200',
  frequency: '1.18',
  actions: [
    { action_type: 'video_view', value: '293' },
    { action_type: 'link_click', value: '42' }
  ],
  action_values: [
    { action_type: 'purchase', value: '250.00' }
  ],
  cost_per_action_type: [
    { action_type: 'purchase', value: '5.02' }
  ],
  // Test different video action formats Meta might return
  video_thruplay_watched_actions: [
    { action_type: 'video_view', value: '62' }
  ],
  video_15_sec_watched_actions: [
    { action_type: 'video_view', value: '62' }
  ],
  video_30_sec_watched_actions: [
    { action_type: 'video_view', value: '26' }
  ],
  video_p25_watched_actions: [
    { action_type: 'video_view', value: '132' }
  ],
  video_p50_watched_actions: [
    { action_type: 'video_view', value: '75' }
  ],
  video_p75_watched_actions: [
    { action_type: 'video_view', value: '33' }
  ],
  video_p95_watched_actions: [
    { action_type: 'video_view', value: '27' }
  ],
  video_p100_watched_actions: [
    { action_type: 'video_view', value: '27' }
  ]
};

// Mock insight with missing video data (the problem case)
const mockInsightMissingVideo = {
  ...mockKaylynInsight,
  date_start: '2025-08-16',
  ad_id: '120218148594730014',
  impressions: '2424',
  video_thruplay_watched_actions: [], // Empty array
  video_15_sec_watched_actions: null, // Null value
  video_30_sec_watched_actions: undefined // Undefined
};

function testVideoMetricsTransformation() {
  console.log('🔍 Testing Kaylyn ad data (Aug 19 - with video data):');
  
  try {
    const transformed = DataTransformer.transformMetaInsight(mockKaylynInsight);
    
    console.log('✅ Transformation successful!');
    console.log('📊 Video Metrics Results:');
    console.log(`  Video Views: ${transformed.video_views}`);
    console.log(`  ThruPlay: ${transformed.video_thruplay_watched_actions}`);
    console.log(`  15-sec Views: ${transformed.video_15_sec_watched_actions}`);
    console.log(`  30-sec Views: ${transformed.video_30_sec_watched_actions}`);
    console.log(`  P95 Views: ${transformed.video_p95_watched_actions}`);
    
    // Calculate hold rate like our dashboard does
    const impressions = transformed.impressions;
    const thruplay = transformed.video_thruplay_watched_actions;
    const holdRate = impressions > 0 ? (thruplay / impressions) * 100 : 0;
    
    console.log(`\n🎯 Calculated Hold Rate: ${holdRate.toFixed(2)}%`);
    console.log(`  Expected from Ads Manager: 2.37% (62/2614)`);
    console.log(`  Match: ${Math.abs(holdRate - 2.37) < 0.01 ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Transformation failed:', error.message);
  }
  
  console.log('\n🔍 Testing missing video data handling (Aug 16):');
  
  try {
    const transformed = DataTransformer.transformMetaInsight(mockInsightMissingVideo);
    
    console.log('✅ Transformation successful!');
    console.log('📊 Video Metrics Results (should be 0, not undefined):');
    console.log(`  Video Views: ${transformed.video_views}`);
    console.log(`  ThruPlay: ${transformed.video_thruplay_watched_actions} (was missing)`);
    console.log(`  15-sec Views: ${transformed.video_15_sec_watched_actions} (was missing)`);
    console.log(`  30-sec Views: ${transformed.video_30_sec_watched_actions} (was missing)`);
    
    // Verify our fix: values should be 0, not undefined
    const allZeros = [
      transformed.video_thruplay_watched_actions,
      transformed.video_15_sec_watched_actions,
      transformed.video_30_sec_watched_actions
    ].every(val => val === 0);
    
    console.log(`\n✅ Zero handling fix: ${allZeros ? 'WORKING' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Transformation failed:', error.message);
  }
}

function testDataValidation() {
  console.log('\n🛡️ Testing Data Quality Validation:');
  
  // Test with good data
  const goodInsight = DataTransformer.transformMetaInsight(mockKaylynInsight);
  const isValid = DataTransformer.validateInsight(goodInsight);
  console.log(`✅ Valid insight validation: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  // Test with problematic data
  const badInsight = {
    ...goodInsight,
    video_views: 5000,  // More video views than impressions
    impressions: 2614
  };
  
  console.log('🔍 Testing validation with suspicious data (video views > impressions)...');
  DataTransformer.validateVideoMetricsQuality(badInsight);
  console.log('✅ Data quality warnings should appear above');
}

// Run the tests
testVideoMetricsTransformation();
testDataValidation();

console.log('\n🎉 Video metrics transformation test complete!');
console.log('📝 Next steps:');
console.log('  1. Run manual ETL for Aug 13-19 to reprocess data');
console.log('  2. Verify improved data quality in dashboard');
console.log('  3. Compare with Ads Manager metrics');