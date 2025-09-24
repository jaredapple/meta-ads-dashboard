-- Function to update computed metrics (CTR, CPC, CPM) for a specific account
-- This ensures consistent calculation across all accounts

CREATE OR REPLACE FUNCTION update_computed_metrics(target_account_id VARCHAR(50))
RETURNS void AS $$
BEGIN
    -- Update CTR (Click Through Rate) = (clicks / impressions) * 100
    UPDATE daily_ad_insights 
    SET ctr = CASE 
        WHEN impressions > 0 THEN ROUND(((clicks::numeric / impressions::numeric) * 100)::numeric, 4)
        ELSE 0 
    END
    WHERE account_id = target_account_id 
    AND impressions > 0
    AND (ctr IS NULL OR ctr = 0);

    -- Update CPC (Cost Per Click) = spend / clicks
    UPDATE daily_ad_insights 
    SET cpc = CASE 
        WHEN clicks > 0 THEN ROUND((spend::numeric / clicks::numeric)::numeric, 4)
        ELSE 0 
    END
    WHERE account_id = target_account_id 
    AND clicks > 0
    AND (cpc IS NULL OR cpc = 0);

    -- Update CPM (Cost Per Mille) = (spend / impressions) * 1000
    UPDATE daily_ad_insights 
    SET cpm = CASE 
        WHEN impressions > 0 THEN ROUND(((spend::numeric / impressions::numeric) * 1000)::numeric, 4)
        ELSE 0 
    END
    WHERE account_id = target_account_id 
    AND impressions > 0
    AND (cpm IS NULL OR cpm = 0);

    -- Update ROAS if not already calculated
    UPDATE daily_ad_insights 
    SET roas = CASE 
        WHEN spend > 0 AND conversion_values > 0 THEN ROUND((conversion_values::numeric / spend::numeric)::numeric, 4)
        ELSE 0 
    END
    WHERE account_id = target_account_id 
    AND spend > 0 
    AND conversion_values > 0
    AND (roas IS NULL OR roas = 0);

END;
$$ LANGUAGE plpgsql;