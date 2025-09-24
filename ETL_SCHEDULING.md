# ETL Scheduling Guide

## Overview

The Meta MCP application requires daily ETL (Extract, Transform, Load) processes to keep advertising data up-to-date. This guide covers how to set up automated scheduling to prevent data gaps.

## Scheduling Options

### Option 1: Cron Job (Recommended)

Add the following line to your crontab to run ETL daily at 6 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 6 * * * /Users/jaredapplebaum/Desktop/Meta\ MCP/schedule-etl.sh
```

### Option 2: Manual Daily Execution

Run the ETL manually each day:

```bash
cd "/Users/jaredapplebaum/Desktop/Meta MCP"
npm run etl
```

### Option 3: Date Range Backfill

For missed days or data gaps:

```bash
# Backfill specific date
npm run etl 2025-08-15

# Backfill date range  
npm run etl 2025-08-01 2025-08-15
```

## ETL Best Practices

### 1. **Daily Execution**
- Run ETL at least once per day
- Meta API data is typically available with a 1-day delay
- Schedule for early morning (6 AM) to capture previous day's data

### 2. **Monitor for Failures**
- Check ETL logs in `logs/etl-YYYYMMDD.log`
- Set up notifications for failures (Slack, email, etc.)
- Common failure points:
  - API rate limits
  - Network connectivity  
  - Database connection issues

### 3. **Data Validation**
- Verify daily data completeness
- Check for significant spend/impression changes
- Monitor for missing campaigns/ads

### 4. **Error Recovery**
- ETL is idempotent - safe to re-run for same dates
- Use date range backfill for missed periods
- Check database constraints for data integrity

## Troubleshooting

### Missing Data Symptoms
- Lower spend amounts than expected
- Incomplete monthly totals in MCP queries
- Gaps in trend analysis

### Recovery Steps
1. **Identify missing date range**
2. **Run backfill ETL**:
   ```bash
   npm run etl YYYY-MM-DD YYYY-MM-DD
   ```
3. **Verify data completeness**
4. **Update scheduling to prevent future gaps**

### Common Issues

#### API Rate Limits
- Meta API has strict rate limits
- ETL includes automatic retry logic
- Consider spreading large backfills across multiple runs

#### Account ID Format Issues
- Ensure `META_ACCOUNT_ID` in `.env` does NOT include `act_` prefix
- ETL handles format normalization automatically

#### Database Connection
- Verify Supabase credentials in `.env`
- Check network connectivity
- Monitor database performance during large ETL runs

## Monitoring

### Log Files
- Location: `logs/etl-YYYYMMDD.log`
- Retention: 30 days (auto-cleanup)
- Contains detailed execution statistics

### ETL Statistics
Each run reports:
- Accounts processed
- Campaigns processed  
- Ad sets processed
- Ads processed
- Insights processed
- Execution duration
- Error count

### Data Verification
After ETL completion, verify:
- Expected number of insights records
- Spend totals match expectations
- No missing date gaps
- MCP queries return correct totals

## Example Cron Setup

```bash
# Meta MCP ETL - Daily at 6 AM
0 6 * * * /Users/jaredapplebaum/Desktop/Meta\ MCP/schedule-etl.sh

# Optional: Weekly data validation check
0 7 * * 1 /Users/jaredapplebaum/Desktop/Meta\ MCP/validate-data.sh
```

## Emergency Recovery

For significant data loss or corruption:

1. **Stop any running ETL processes**
2. **Backup current database state**
3. **Run full historical backfill**:
   ```bash
   # Example: Rebuild last 30 days
   npm run etl 2025-07-18 2025-08-17
   ```
4. **Verify data integrity**
5. **Resume normal scheduling**

Remember: ETL operations are designed to be safe to re-run, so when in doubt, re-run the ETL for the affected date range.