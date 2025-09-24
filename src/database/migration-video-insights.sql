-- Video Ad Insights Migration
-- This migration adds video-specific metrics and analysis tables

-- Create table for video ad insights
CREATE TABLE IF NOT EXISTS video_ad_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_start DATE NOT NULL,
    ad_id VARCHAR(50) NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    ad_set_id VARCHAR(50) NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Video identification
    creative_id VARCHAR(50),
    video_title TEXT,
    video_duration_seconds INTEGER,
    thumbnail_url TEXT,
    
    -- Core metrics
    impressions BIGINT NOT NULL DEFAULT 0,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Video view metrics
    video_plays BIGINT DEFAULT 0, -- Video starts
    video_thruplay_watched_actions BIGINT DEFAULT 0, -- 3-second views (for hook analysis)
    video_p25_watched_actions BIGINT DEFAULT 0, -- 25% completion
    video_p50_watched_actions BIGINT DEFAULT 0, -- 50% completion
    video_p75_watched_actions BIGINT DEFAULT 0, -- 75% completion
    video_p95_watched_actions BIGINT DEFAULT 0, -- 95% completion
    video_p100_watched_actions BIGINT DEFAULT 0, -- 100% completion
    video_15_sec_watched_actions BIGINT DEFAULT 0, -- 15-second views
    video_30_sec_watched_actions BIGINT DEFAULT 0, -- 30-second views
    video_avg_time_watched_actions DECIMAL(10,2) DEFAULT 0, -- Average watch time in seconds
    
    -- Engagement metrics
    clicks BIGINT DEFAULT 0,
    link_clicks BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_values DECIMAL(12,2) DEFAULT 0.00,
    
    -- Calculated metrics for hook and retention analysis
    thumbstop_rate DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_thruplay_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    hold_rate_15s DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_15_sec_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    completion_rate DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_p100_watched_actions::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    avg_watch_percentage DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN video_duration_seconds > 0 AND video_plays > 0 
            THEN ROUND((video_avg_time_watched_actions / video_duration_seconds) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    cost_per_thumbstop DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN video_thruplay_watched_actions > 0 THEN ROUND(spend / video_thruplay_watched_actions, 2)
            ELSE 0
        END
    ) STORED,
    
    -- Performance scoring
    hook_score DECIMAL(5,2), -- 0-100 score based on thumbstop rate benchmarks
    retention_score DECIMAL(5,2), -- 0-100 score based on retention benchmarks
    engagement_score DECIMAL(5,2), -- 0-100 composite score
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per ad per day
    UNIQUE(ad_id, date_start)
);

-- Create table for video performance benchmarks and recommendations
CREATE TABLE IF NOT EXISTS video_performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(50) NOT NULL,
    industry VARCHAR(100),
    platform VARCHAR(50) DEFAULT 'Facebook',
    
    -- Benchmark values
    poor_threshold DECIMAL(8,4), -- Below this is poor
    fair_threshold DECIMAL(8,4), -- Between poor and fair
    good_threshold DECIMAL(8,4), -- Between fair and good
    excellent_threshold DECIMAL(8,4), -- Above this is excellent
    
    -- Metadata
    source TEXT, -- Where the benchmark came from
    last_updated DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(metric_name, industry, platform)
);

-- Insert default benchmarks for video metrics
INSERT INTO video_performance_benchmarks (metric_name, industry, poor_threshold, fair_threshold, good_threshold, excellent_threshold, source, last_updated) VALUES
('thumbstop_rate', 'general', 10.0, 15.0, 20.0, 26.0, 'Meta industry averages', '2025-01-01'),
('hold_rate_15s', 'general', 3.0, 4.5, 6.0, 9.0, 'Meta industry averages', '2025-01-01'),
('completion_rate', 'general', 5.0, 10.0, 15.0, 25.0, 'Meta industry averages', '2025-01-01'),
('avg_watch_percentage', 'general', 20.0, 35.0, 50.0, 70.0, 'Meta industry averages', '2025-01-01')
ON CONFLICT (metric_name, industry, platform) DO NOTHING;

-- Create table for storing video recommendations
CREATE TABLE IF NOT EXISTS video_ad_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id VARCHAR(50) NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- 'scale_up', 'improve_hook', 'improve_retention', 'pause', 'refresh_creative'
    priority VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
    
    -- Recommendation details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_items JSONB, -- Array of specific action items
    
    -- Supporting metrics
    current_metrics JSONB, -- Current performance metrics
    benchmark_comparison JSONB, -- How it compares to benchmarks
    potential_impact JSONB, -- Estimated impact if recommendation is followed
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
    implemented_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- When this recommendation is no longer relevant
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for video insights
CREATE INDEX idx_video_insights_date_start ON video_ad_insights(date_start);
CREATE INDEX idx_video_insights_ad_id ON video_ad_insights(ad_id);
CREATE INDEX idx_video_insights_campaign_id ON video_ad_insights(campaign_id);
CREATE INDEX idx_video_insights_account_id ON video_ad_insights(account_id);
CREATE INDEX idx_video_insights_thumbstop_rate ON video_ad_insights(thumbstop_rate DESC);
CREATE INDEX idx_video_insights_hold_rate ON video_ad_insights(hold_rate_15s DESC);
CREATE INDEX idx_video_insights_completion_rate ON video_ad_insights(completion_rate DESC);

-- Composite indexes for common queries
CREATE INDEX idx_video_insights_date_thumbstop ON video_ad_insights(date_start, thumbstop_rate DESC);
CREATE INDEX idx_video_insights_date_hold_rate ON video_ad_insights(date_start, hold_rate_15s DESC);
CREATE INDEX idx_video_insights_campaign_date ON video_ad_insights(campaign_id, date_start);

-- Indexes for recommendations
CREATE INDEX idx_video_recommendations_ad_id ON video_ad_recommendations(ad_id);
CREATE INDEX idx_video_recommendations_type ON video_ad_recommendations(recommendation_type);
CREATE INDEX idx_video_recommendations_priority ON video_ad_recommendations(priority);
CREATE INDEX idx_video_recommendations_status ON video_ad_recommendations(status);

-- Update triggers for updated_at
CREATE TRIGGER update_video_insights_updated_at BEFORE UPDATE ON video_ad_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_recommendations_updated_at BEFORE UPDATE ON video_ad_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for video performance summary
CREATE OR REPLACE VIEW video_performance_summary AS
SELECT 
    vai.ad_id,
    a.name as ad_name,
    c.name as campaign_name,
    vai.campaign_id,
    vai.video_title,
    vai.video_duration_seconds,
    COUNT(DISTINCT vai.date_start) as days_running,
    SUM(vai.impressions) as total_impressions,
    SUM(vai.spend) as total_spend,
    AVG(vai.thumbstop_rate) as avg_thumbstop_rate,
    AVG(vai.hold_rate_15s) as avg_hold_rate,
    AVG(vai.completion_rate) as avg_completion_rate,
    AVG(vai.avg_watch_percentage) as avg_watch_percentage,
    SUM(vai.conversions) as total_conversions,
    CASE 
        WHEN SUM(vai.spend) > 0 THEN SUM(vai.conversion_values) / SUM(vai.spend)
        ELSE 0
    END as roas,
    MAX(vai.date_start) as last_active_date
FROM video_ad_insights vai
JOIN ads a ON vai.ad_id = a.id
JOIN campaigns c ON vai.campaign_id = c.id
WHERE vai.impressions > 100 -- Filter out low-volume ads
GROUP BY vai.ad_id, a.name, c.name, vai.campaign_id, vai.video_title, vai.video_duration_seconds;