# Apply Computed Columns Migration

## Critical Database Migration Required

To fix the remaining data accuracy issues, you need to apply the migration that removes computed columns.

### Step 1: Apply Migration in Supabase Dashboard

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy and execute** the SQL from: `src/database/migration-remove-computed-columns.sql`

### Step 2: Run ETL Backfill with New Parameters

After the migration is applied, run:

```bash
cd "/Users/jaredapplebaum/Desktop/Meta MCP"
npm run etl 2025-08-01 2025-08-16
```

## What This Migration Does

### ✅ **Removes Computed Columns**
- Eliminates database CTR/CPC/CPM calculations that conflict with app calculations
- Prevents double-rounding issues

### ✅ **Adds Attribution Parameters**
- `use_unified_attribution_setting=true` - Matches Ads Manager behavior
- `action_attribution_windows` - Uses consistent attribution windows

### ✅ **Fixes Date Range Logic**
- "This month" now excludes incomplete current day data
- Uses yesterday as end date for data completeness

### ✅ **Higher Precision Storage**
- Increased decimal precision for calculations
- Eliminates rounding errors in data pipeline

## Expected Results After Migration + ETL

- **Exact spend match**: $13,913.18 (not $13,933.34)
- **Exact CPA match**: $93.38 (not $93.51)  
- **Accurate CTR/CPC**: Matching Meta Ads Manager precisely

## Why This Migration Is Critical

1. **Database computed columns** were recalculating CTR/CPC/CPM differently than Meta
2. **Attribution misalignment** was causing spend discrepancies
3. **Incomplete current day data** was being included in "this month" queries
4. **Double rounding** was accumulating precision errors

Run the migration in Supabase, then the ETL, and the data should be 100% accurate!