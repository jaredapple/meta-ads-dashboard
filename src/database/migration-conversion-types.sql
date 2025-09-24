-- Migration: Add separate conversion type columns to daily_ad_insights
-- This migration adds specific conversion type fields to fix data accuracy issues

BEGIN;

-- Add separate conversion type columns
ALTER TABLE daily_ad_insights 
ADD COLUMN purchases DECIMAL(10,2) DEFAULT 0,
ADD COLUMN leads DECIMAL(10,2) DEFAULT 0,
ADD COLUMN registrations DECIMAL(10,2) DEFAULT 0,
ADD COLUMN add_to_carts DECIMAL(10,2) DEFAULT 0;

-- Add conversion values by type
ALTER TABLE daily_ad_insights
ADD COLUMN purchase_values DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN lead_values DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN registration_values DECIMAL(12,2) DEFAULT 0.00;

-- Add purchase-specific calculated columns
ALTER TABLE daily_ad_insights
ADD COLUMN purchase_cpa DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE 
        WHEN purchases > 0 THEN ROUND(spend / purchases, 2)
        ELSE NULL
    END
) STORED,
ADD COLUMN purchase_roas DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
        WHEN spend > 0 AND purchase_values > 0 THEN ROUND(purchase_values / spend, 4)
        ELSE NULL
    END
) STORED;

-- Update existing ROAS calculation to use purchase_values specifically
-- (keeping legacy roas for backward compatibility but making it more accurate)
-- Note: This will be updated during the data backfill

-- Add indexes for the new columns
CREATE INDEX idx_daily_insights_purchases ON daily_ad_insights(purchases DESC) WHERE purchases > 0;
CREATE INDEX idx_daily_insights_purchase_cpa ON daily_ad_insights(purchase_cpa) WHERE purchase_cpa IS NOT NULL;
CREATE INDEX idx_daily_insights_purchase_roas ON daily_ad_insights(purchase_roas DESC) WHERE purchase_roas IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN daily_ad_insights.purchases IS 'Purchase conversions only (accurate for CPA calculation)';
COMMENT ON COLUMN daily_ad_insights.leads IS 'Lead conversions';
COMMENT ON COLUMN daily_ad_insights.registrations IS 'Registration/signup conversions';
COMMENT ON COLUMN daily_ad_insights.add_to_carts IS 'Add to cart actions';
COMMENT ON COLUMN daily_ad_insights.purchase_values IS 'Revenue from purchases';
COMMENT ON COLUMN daily_ad_insights.lead_values IS 'Value assigned to leads';
COMMENT ON COLUMN daily_ad_insights.registration_values IS 'Value assigned to registrations';
COMMENT ON COLUMN daily_ad_insights.purchase_cpa IS 'Cost per purchase (spend / purchases)';
COMMENT ON COLUMN daily_ad_insights.purchase_roas IS 'Return on ad spend for purchases only';

COMMIT;