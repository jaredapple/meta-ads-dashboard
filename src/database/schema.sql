-- Meta Marketing API Data Schema
-- This schema normalizes Meta ad data into dimension and fact tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE campaign_objective AS ENUM (
    'OUTCOME_AWARENESS',
    'OUTCOME_TRAFFIC', 
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS',
    'OUTCOME_APP_PROMOTION',
    'OUTCOME_SALES'
);

CREATE TYPE campaign_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'DELETED',
    'ARCHIVED'
);

CREATE TYPE ad_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'DELETED',
    'ARCHIVED',
    'PENDING_REVIEW',
    'DISAPPROVED',
    'PREAPPROVED',
    'PENDING_BILLING_INFO',
    'CAMPAIGN_PAUSED',
    'ADSET_PAUSED'
);

-- Dimension Tables

-- Ad Accounts
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,  -- Meta account ID
    name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    business_id VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns  
CREATE TABLE campaigns (
    id VARCHAR(50) PRIMARY KEY,  -- Meta campaign ID
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    objective campaign_objective NOT NULL,
    status campaign_status NOT NULL,
    daily_budget DECIMAL(12,2),
    lifetime_budget DECIMAL(12,2),
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ad Sets
CREATE TABLE ad_sets (
    id VARCHAR(50) PRIMARY KEY,  -- Meta adset ID  
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status campaign_status NOT NULL,
    daily_budget DECIMAL(12,2),
    lifetime_budget DECIMAL(12,2),
    bid_amount DECIMAL(12,2),
    optimization_goal TEXT,
    billing_event TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ads
CREATE TABLE ads (
    id VARCHAR(50) PRIMARY KEY,  -- Meta ad ID
    ad_set_id VARCHAR(50) NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, 
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status ad_status NOT NULL,
    creative_id VARCHAR(50),
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fact Tables

-- Daily Ad Insights (main metrics table)
CREATE TABLE daily_ad_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_start DATE NOT NULL,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_set_id VARCHAR(50) NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    ad_id VARCHAR(50) NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Core metrics
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(8,4) DEFAULT 0,
    
    -- Conversion metrics  
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_values DECIMAL(12,2) DEFAULT 0.00,
    cost_per_conversion DECIMAL(12,2) DEFAULT 0.00,
    
    -- Engagement metrics
    link_clicks BIGINT DEFAULT 0,
    video_views BIGINT DEFAULT 0,
    video_p25_watched_actions BIGINT DEFAULT 0,
    video_p50_watched_actions BIGINT DEFAULT 0, 
    video_p75_watched_actions BIGINT DEFAULT 0,
    video_p100_watched_actions BIGINT DEFAULT 0,
    
    -- Calculated metrics (computed on insert/update)
    ctr DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((clicks::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    cpc DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN clicks > 0 THEN ROUND(spend / clicks, 2)
            ELSE 0
        END
    ) STORED,
    
    cpm DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((spend / impressions::DECIMAL) * 1000, 2)
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
    
    -- Ensure one record per ad per day
    UNIQUE(ad_id, date_start)
);

-- Daily Demographic Insights (audience breakdown by demographics)
CREATE TABLE daily_demographic_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_start DATE NOT NULL,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_set_id VARCHAR(50) NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    ad_id VARCHAR(50) NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Demographic dimensions
    age_range VARCHAR(20), -- e.g., '25-34', '35-44', '45-54'
    gender VARCHAR(10), -- 'male', 'female', 'unknown'
    country_code VARCHAR(2), -- ISO country code
    region VARCHAR(100), -- State/province/region
    
    -- Core metrics for this demographic segment
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reach BIGINT DEFAULT 0,
    
    -- Conversion metrics
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_values DECIMAL(12,2) DEFAULT 0.00,
    
    -- Calculated metrics (computed on insert/update)
    ctr DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((clicks::DECIMAL / impressions::DECIMAL) * 100, 4)
            ELSE 0
        END
    ) STORED,
    
    cpc DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN clicks > 0 THEN ROUND(spend / clicks, 2)
            ELSE 0
        END
    ) STORED,
    
    cpm DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 THEN ROUND((spend / impressions::DECIMAL) * 1000, 2)
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
    
    -- Ensure one record per ad per day per demographic segment
    UNIQUE(ad_id, date_start, age_range, gender, country_code, region)
);

-- Indexes for performance

-- Core dimension indexes
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_objective ON campaigns(objective);

CREATE INDEX idx_ad_sets_campaign_id ON ad_sets(campaign_id);
CREATE INDEX idx_ad_sets_account_id ON ad_sets(account_id);
CREATE INDEX idx_ad_sets_status ON ad_sets(status);

CREATE INDEX idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX idx_ads_campaign_id ON ads(campaign_id);
CREATE INDEX idx_ads_account_id ON ads(account_id);
CREATE INDEX idx_ads_status ON ads(status);

-- Fact table indexes for query performance
CREATE INDEX idx_daily_insights_date_start ON daily_ad_insights(date_start);
CREATE INDEX idx_daily_insights_account_id ON daily_ad_insights(account_id);
CREATE INDEX idx_daily_insights_campaign_id ON daily_ad_insights(campaign_id);
CREATE INDEX idx_daily_insights_ad_set_id ON daily_ad_insights(ad_set_id);
CREATE INDEX idx_daily_insights_ad_id ON daily_ad_insights(ad_id);

-- Composite indexes for common queries
CREATE INDEX idx_daily_insights_account_date ON daily_ad_insights(account_id, date_start);
CREATE INDEX idx_daily_insights_campaign_date ON daily_ad_insights(campaign_id, date_start);
CREATE INDEX idx_daily_insights_date_spend ON daily_ad_insights(date_start, spend DESC);
CREATE INDEX idx_daily_insights_date_roas ON daily_ad_insights(date_start, roas DESC);
CREATE INDEX idx_daily_insights_date_conversions ON daily_ad_insights(date_start, conversions DESC);

-- Demographic insights indexes
CREATE INDEX idx_demographic_insights_date_start ON daily_demographic_insights(date_start);
CREATE INDEX idx_demographic_insights_account_id ON daily_demographic_insights(account_id);
CREATE INDEX idx_demographic_insights_campaign_id ON daily_demographic_insights(campaign_id);
CREATE INDEX idx_demographic_insights_ad_set_id ON daily_demographic_insights(ad_set_id);
CREATE INDEX idx_demographic_insights_ad_id ON daily_demographic_insights(ad_id);

-- Demographic dimension indexes
CREATE INDEX idx_demographic_insights_age_range ON daily_demographic_insights(age_range);
CREATE INDEX idx_demographic_insights_gender ON daily_demographic_insights(gender);
CREATE INDEX idx_demographic_insights_country ON daily_demographic_insights(country_code);
CREATE INDEX idx_demographic_insights_region ON daily_demographic_insights(region);

-- Composite indexes for demographic queries
CREATE INDEX idx_demographic_insights_account_date ON daily_demographic_insights(account_id, date_start);
CREATE INDEX idx_demographic_insights_campaign_date ON daily_demographic_insights(campaign_id, date_start);
CREATE INDEX idx_demographic_insights_age_gender ON daily_demographic_insights(age_range, gender);
CREATE INDEX idx_demographic_insights_location ON daily_demographic_insights(country_code, region);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_insights_updated_at BEFORE UPDATE ON daily_ad_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demographic_insights_updated_at BEFORE UPDATE ON daily_demographic_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();