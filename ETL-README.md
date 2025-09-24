# Standardized ETL Pipeline for Multi-Account Meta Ads Dashboard

## Overview

The standardized ETL pipeline provides a unified, comprehensive approach to data synchronization across all client accounts. This system replaces the previous ad-hoc sync scripts with a robust, scalable solution.

## Features

✅ **Unified Data Collection**: Single service handles all aspects of data sync
✅ **Account Metadata Sync**: Automatically updates account information
✅ **Campaign Structure Sync**: Syncs campaigns, ad sets, and ads
✅ **Complete Insights Data**: Includes conversions, ROAS, and all key metrics
✅ **Computed Metrics**: Automatically calculates CTR, CPC, CPM, and ROAS
✅ **Data Validation**: Built-in quality checks and issue detection
✅ **Error Handling**: Graceful handling of API errors and rate limits
✅ **Encryption Support**: Handles both encrypted and plaintext tokens

## Components

### 1. StandardizedETLService (`src/services/standardized-etl.js`)

Main ETL service that handles:
- Account credential management and decryption
- Meta API data fetching with proper error handling
- Database synchronization with upsert operations
- Computed metric calculations
- Comprehensive logging and reporting

### 2. DataValidationService (`src/services/data-validation.js`)

Data quality service that provides:
- Recent data validation
- Missing metrics detection
- Data consistency checks
- Outlier detection
- Automatic issue fixing

## Usage

### Run Complete ETL Sync

```bash
# Sync all active accounts with full data collection
node run-standardized-etl.js
```

### Run Data Validation

```bash
# Validate data quality and fix common issues
node validate-data.js
```

### Quick Testing

```bash
# Test ETL on single account
node test-etl-quick.js
```

## ETL Process Flow

1. **Account Discovery**: Fetches all active accounts from `client_accounts` table
2. **Token Decryption**: Safely decrypts access tokens (supports both encrypted and plaintext)
3. **For Each Account**:
   - Updates account metadata from Meta API
   - Syncs campaign structure (campaigns → ad sets → ads)
   - Fetches 30 days of account-level insights with conversions
   - Creates aggregated ad structure for account-level data
   - Calculates computed metrics (CTR, CPC, CPM, ROAS)
   - Updates sync status and timestamps

## Data Validation Checks

- **Recent Data**: Ensures data exists within last 3 days
- **Missing Metrics**: Identifies accounts with incomplete ROAS, CTR, CPC data
- **Data Consistency**: Validates logical relationships (clicks ≤ impressions)
- **Outlier Detection**: Flags unusually high spend or ROAS values

## Database Schema

### Client Accounts (`client_accounts`)
```sql
- id: UUID (primary key)
- client_name: Text
- meta_account_id: VARCHAR(50) (unique)
- access_token: Text (encrypted)
- timezone: VARCHAR(50)
- currency: VARCHAR(3)
- is_active: Boolean
- sync_status: VARCHAR(50)
- last_sync: Timestamp
```

### Insights Data (`daily_ad_insights`)
All insights are stored with computed metrics:
- CTR = (clicks / impressions) × 100
- CPC = spend / clicks
- CPM = (spend / impressions) × 1000
- ROAS = conversion_values / spend

## Migration from Old System

The standardized ETL replaces these previous scripts:
- `sync-conversions.js` → Built into insights sync
- `sync-accounts.js` → Built into metadata sync
- `sync-account-level.js` → Built into insights sync
- Manual metric updates → Automated in ETL

## Rate Limiting & Performance

- 3-second delays between accounts
- Graceful error handling for API failures
- Efficient upsert operations
- Minimal API calls per account (3-5 requests typically)

## Monitoring & Logging

The ETL provides comprehensive logging:
- Account-by-account progress
- API response details
- Metric calculation results
- Error details with context
- Final summary report with ROAS data

## Error Recovery

- Continues processing other accounts if one fails
- Updates sync status appropriately
- Provides detailed error messages
- Supports manual re-sync of failed accounts

## Configuration

Ensure these environment variables are set:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ENCRYPTION_KEY=your_encryption_key
```

## Future Enhancements

- Scheduled ETL via cron jobs
- Real-time sync triggers
- Advanced anomaly detection
- Performance metrics tracking
- Automated alerting for data issues

---

**Last Updated**: August 21, 2025  
**System Status**: Production Ready ✅