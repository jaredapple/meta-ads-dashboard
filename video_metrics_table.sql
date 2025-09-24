-- Create proper video metrics table
CREATE TABLE video_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_start DATE NOT NULL,
    ad_id VARCHAR(50) NOT NULL,
    ad_set_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    
    -- Ad details
    ad_name TEXT,
    campaign_name TEXT,
    
    -- Core metrics
    impressions BIGINT NOT NULL DEFAULT 0,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Video engagement metrics (raw counts from Meta API)
    video_plays BIGINT DEFAULT 0,                    -- video_play_actions (initial video starts)
    video_3sec_views BIGINT DEFAULT 0,              -- video_thruplay_watched_actions (3-second views = thumbstops)
    video_15sec_views BIGINT DEFAULT 0,             -- video_15_sec_watched_actions (15-second views)
    video_30sec_views BIGINT DEFAULT 0,             -- video_30_sec_watched_actions
    video_p25_watched BIGINT DEFAULT 0,             -- video_p25_watched_actions (25% completion)
    video_p50_watched BIGINT DEFAULT 0,             -- video_p50_watched_actions (50% completion)
    video_p75_watched BIGINT DEFAULT 0,             -- video_p75_watched_actions (75% completion)
    video_p100_watched BIGINT DEFAULT 0,            -- video_p100_watched_actions (100% completion)
    video_avg_watch_time DECIMAL(10,2) DEFAULT 0,   -- video_avg_time_watched_actions
    
    -- Business metrics
    clicks BIGINT DEFAULT 0,
    link_clicks BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_values DECIMAL(12,2) DEFAULT 0.00,
    
    -- Calculated video performance rates (auto-calculated)
    thumbstop_rate DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_3sec_views::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    hold_rate DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_15sec_views::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    completion_rate DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_p100_watched::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    watch_through_25 DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_p25_watched::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    watch_through_50 DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_p50_watched::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    watch_through_75 DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((video_p75_watched::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    cost_per_thumbstop DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN video_3sec_views > 0 THEN ROUND(spend / video_3sec_views, 2)
            ELSE 0
        END
    ) STORED,
    
    cost_per_completion DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN video_p100_watched > 0 THEN ROUND(spend / video_p100_watched, 2)
            ELSE 0
        END
    ) STORED,
    
    roas DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN spend > 0 THEN ROUND(conversion_values / spend, 4)
            ELSE 0
        END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(ad_id, date_start)
);

-- Create indexes for performance
CREATE INDEX idx_video_metrics_date ON video_metrics(date_start);
CREATE INDEX idx_video_metrics_ad_id ON video_metrics(ad_id);
CREATE INDEX idx_video_metrics_campaign_id ON video_metrics(campaign_id);
CREATE INDEX idx_video_metrics_account_id ON video_metrics(account_id);
CREATE INDEX idx_video_metrics_thumbstop_rate ON video_metrics(thumbstop_rate DESC);
CREATE INDEX idx_video_metrics_hold_rate ON video_metrics(hold_rate DESC);
CREATE INDEX idx_video_metrics_completion_rate ON video_metrics(completion_rate DESC);

-- Create composite indexes for common queries
CREATE INDEX idx_video_metrics_account_date ON video_metrics(account_id, date_start);
CREATE INDEX idx_video_metrics_campaign_date ON video_metrics(campaign_id, date_start);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_metrics_updated_at 
    BEFORE UPDATE ON video_metrics
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();