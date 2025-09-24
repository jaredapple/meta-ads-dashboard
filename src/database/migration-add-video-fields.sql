-- Add video metrics fields to daily_ad_insights table
-- This migration adds the missing video metrics for hook and retention analysis

-- Add new video metric columns
ALTER TABLE daily_ad_insights 
ADD COLUMN IF NOT EXISTS video_thruplay_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_15_sec_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_30_sec_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p95_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_avg_time_watched_actions DECIMAL(10,2) DEFAULT 0;

-- Add calculated metrics for video analysis
ALTER TABLE daily_ad_insights 
ADD COLUMN IF NOT EXISTS thumbstop_rate DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
        WHEN impressions > 0 THEN ROUND((video_thruplay_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
        ELSE 0
    END
) STORED,
ADD COLUMN IF NOT EXISTS hold_rate_15s DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
        WHEN impressions > 0 THEN ROUND((video_15_sec_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
        ELSE 0
    END
) STORED,
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
        WHEN impressions > 0 THEN ROUND((video_p100_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
        ELSE 0
    END
) STORED,
ADD COLUMN IF NOT EXISTS cost_per_thumbstop DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE 
        WHEN video_thruplay_watched_actions > 0 THEN ROUND(spend / video_thruplay_watched_actions, 2)
        ELSE 0
    END
) STORED;

-- Create indexes for video metrics
CREATE INDEX IF NOT EXISTS idx_daily_insights_thumbstop_rate ON daily_ad_insights(thumbstop_rate DESC);
CREATE INDEX IF NOT EXISTS idx_daily_insights_hold_rate ON daily_ad_insights(hold_rate_15s DESC);
CREATE INDEX IF NOT EXISTS idx_daily_insights_completion_rate ON daily_ad_insights(completion_rate DESC);

-- Create composite indexes for video analysis queries
CREATE INDEX IF NOT EXISTS idx_daily_insights_date_thumbstop ON daily_ad_insights(date_start, thumbstop_rate DESC);
CREATE INDEX IF NOT EXISTS idx_daily_insights_date_hold_rate ON daily_ad_insights(date_start, hold_rate_15s DESC);

-- Create view for video ad performance summary
CREATE OR REPLACE VIEW video_ads_performance AS
SELECT 
    dai.ad_id,
    a.name as ad_name,
    c.name as campaign_name,
    dai.campaign_id,
    COUNT(DISTINCT dai.date_start) as days_running,
    SUM(dai.impressions) as total_impressions,
    SUM(dai.spend) as total_spend,
    SUM(dai.video_thruplay_watched_actions) as total_thumbstops,
    SUM(dai.video_15_sec_watched_actions) as total_15sec_views,
    SUM(dai.video_p100_watched_actions) as total_completions,
    -- Calculate weighted averages for rates
    CASE 
        WHEN SUM(dai.impressions) > 0 
        THEN ROUND((SUM(dai.video_thruplay_watched_actions)::DECIMAL / SUM(dai.impressions)::DECIMAL) * 100, 2)
        ELSE 0
    END as avg_thumbstop_rate,
    CASE 
        WHEN SUM(dai.impressions) > 0 
        THEN ROUND((SUM(dai.video_15_sec_watched_actions)::DECIMAL / SUM(dai.impressions)::DECIMAL) * 100, 2)
        ELSE 0
    END as avg_hold_rate,
    CASE 
        WHEN SUM(dai.impressions) > 0 
        THEN ROUND((SUM(dai.video_p100_watched_actions)::DECIMAL / SUM(dai.impressions)::DECIMAL) * 100, 2)
        ELSE 0
    END as avg_completion_rate,
    SUM(dai.conversions) as total_conversions,
    SUM(dai.conversion_values) as total_conversion_values,
    CASE 
        WHEN SUM(dai.spend) > 0 THEN ROUND(SUM(dai.conversion_values) / SUM(dai.spend), 2)
        ELSE 0
    END as roas,
    MAX(dai.date_start) as last_active_date
FROM daily_ad_insights dai
JOIN ads a ON dai.ad_id = a.id
JOIN campaigns c ON dai.campaign_id = c.id
WHERE dai.video_thruplay_watched_actions > 0 -- Only include video ads
    AND dai.impressions > 100 -- Filter out low-volume ads
GROUP BY dai.ad_id, a.name, c.name, dai.campaign_id
ORDER BY avg_thumbstop_rate DESC;