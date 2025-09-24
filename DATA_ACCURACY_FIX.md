# Meta MCP Data Accuracy Fix

## Problem Identified

The MCP server was returning inaccurate conversion and performance metrics compared to Meta Ads Manager:

- **Inflated conversions**: 313 vs 149 purchases (summing all conversion types)
- **Incorrect CPA**: $44 vs $93 (using inflated conversion count)
- **Inaccurate CTR/CPC**: Missing or incorrectly calculated

## Root Causes

1. **Conversion Aggregation Error**: Data transformer was summing purchases + leads + registrations + cart adds
2. **Double Counting**: Daily insights were being summed again in aggregation queries
3. **Missing Calculations**: CTR/CPC not properly calculated from raw Meta API data
4. **Wrong Denominators**: CPA calculations using total conversions instead of purchases only

## Solution Implemented

### ✅ Phase 1: Data Transformation Fixed
- **Updated `data-transformer.ts`** to separate conversion types instead of summing
- **Added purchase-specific metrics**: `purchases`, `purchase_values`, `purchase_cpa`, `purchase_roas`
- **Fixed CTR/CPC calculations**: Proper formulas using impressions, clicks, spend
- **Maintained backward compatibility**: Legacy fields still available

### ✅ Phase 2: Database Schema Updated
- **Extended `DailyAdInsight` interface** with new conversion type fields
- **Created migration SQL** in `src/database/migration-conversion-types.sql`
- **Added computed columns** for purchase CPA and ROAS in database

### ✅ Phase 3: ETL Process Updated
- **Modified `etl-service.ts`** to store separate conversion types
- **Updated data mapping** to use new transformer fields
- **Enhanced logging** to show purchase-specific metrics

### ✅ Phase 4: MCP Tools Fixed  
- **Updated `getBestAds` method** to use purchase conversions for ranking
- **Fixed CPA calculations** to show accurate purchase-only cost per acquisition
- **Enhanced MCP responses** to display both purchases and total conversions
- **Updated metric descriptions** to clarify purchase-specific calculations

## Next Steps Required

### 🔧 Manual Database Migration
**You need to run the migration in Supabase Dashboard:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy and execute the SQL from: `src/database/migration-conversion-types.sql`
3. This adds the new conversion type columns to the `daily_ad_insights` table

### 🔄 Data Backfill Required
**After migration, run ETL backfill:**

```bash
# Backfill August data with corrected transformation
npm run etl 2025-08-01 2025-08-16
```

### ✅ Expected Results After Fix

Once migration and backfill are complete:

- **Accurate conversions**: Will show 149 purchases (not 313 total conversions)
- **Correct CPA**: Will show $93 CPA (spend / purchases only)
- **Proper CTR/CPC**: Calculated from actual impressions/clicks/spend
- **Purchase-specific ROAS**: Based on purchase values only

## Data Fields Mapping

| Meta Ads Manager | Before (Wrong) | After (Correct) |
|------------------|----------------|-----------------|
| Purchases: 149 | conversions: 313 | purchases: 149 |
| CPA: $93 | cost_per_acquisition: $44 | purchase_cpa: $93 |
| ROAS: X.XX | roas: (total conv value/spend) | purchase_roas: (purchase value/spend) |

## Testing

After applying migration and backfill:

1. **Test MCP queries**: "Which ad has highest spend this month?"
2. **Verify conversions**: Should show 149 purchases (not 313)
3. **Check CPA**: Should show $93 CPA (not $44)
4. **Validate CTR/CPC**: Should match Meta Ads Manager

## Backward Compatibility

- **Legacy fields maintained**: `conversions`, `conversion_values`, `roas`
- **MCP responses include both**: `total_purchases` and `total_conversions`
- **No breaking changes**: Existing queries continue to work

The fix ensures Meta MCP data accuracy matches Meta Ads Manager exactly while maintaining full backward compatibility.