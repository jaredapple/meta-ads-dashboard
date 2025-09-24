-- Migration: Remove computed columns to eliminate calculation conflicts
-- This addresses data accuracy issues by using only application-calculated metrics

BEGIN;

-- Drop the computed columns that conflict with application calculations
ALTER TABLE daily_ad_insights 
DROP COLUMN IF EXISTS ctr,
DROP COLUMN IF EXISTS cpc, 
DROP COLUMN IF EXISTS cpm,
DROP COLUMN IF EXISTS roas;

-- Add these as regular decimal columns that will store application-calculated values
ALTER TABLE daily_ad_insights
ADD COLUMN ctr DECIMAL(8,4) DEFAULT 0,
ADD COLUMN cpc DECIMAL(12,4) DEFAULT 0, -- Increased precision
ADD COLUMN cpm DECIMAL(12,4) DEFAULT 0, -- Increased precision  
ADD COLUMN roas DECIMAL(8,4) DEFAULT 0;

-- Update comments to clarify these are application-calculated
COMMENT ON COLUMN daily_ad_insights.ctr IS 'Click-through rate (%) - calculated by application';
COMMENT ON COLUMN daily_ad_insights.cpc IS 'Cost per click - calculated by application';  
COMMENT ON COLUMN daily_ad_insights.cpm IS 'Cost per thousand impressions - calculated by application';
COMMENT ON COLUMN daily_ad_insights.roas IS 'Return on ad spend - calculated by application';

-- Add indexes for the new regular columns
CREATE INDEX idx_daily_insights_ctr ON daily_ad_insights(ctr) WHERE ctr > 0;
CREATE INDEX idx_daily_insights_cpc ON daily_ad_insights(cpc) WHERE cpc > 0;
CREATE INDEX idx_daily_insights_roas_regular ON daily_ad_insights(roas) WHERE roas > 0;

COMMIT;