# Real-Time Dashboard Implementation

## Overview
Your Meta Ads Dashboard now supports near real-time data updates with multiple sync mechanisms for keeping your data fresh.

## Features Implemented

### 1. ✅ Automated ETL Scheduling
- **Hourly ETL syncs** via cron job
- Fetches last **3 days of data** (reduced from 30 days for faster syncs)
- Configurable sync frequency
- Automatic cleanup of old logs

### 2. ✅ Dashboard Auto-Refresh
- **5-minute auto-refresh** of dashboard display
- Toggle to enable/disable auto-refresh
- Visual indicator showing refresh status
- Timestamp of last refresh

### 3. ✅ On-Demand Sync
- **"Sync Data Now" button** on dashboard
- Triggers backend ETL process
- Real-time sync status feedback
- Rate limiting to prevent API overload

### 4. ✅ Sync Status Indicators
- Live data indicator (pulsing green dot)
- Syncing spinner animation
- Success/error messages
- Last updated timestamp

## Quick Start

### 1. Set Up Automated ETL

Run the setup script:
```bash
./setup-realtime-etl.sh
```

Or manually add to crontab:
```bash
# Run ETL every hour
0 * * * * /Users/jaredapplebaum/Desktop/Meta\ MCP/schedule-etl.sh
```

### 2. Start Dashboard

```bash
cd dashboard
npm run dev
```

Visit http://localhost:3000 to see your real-time dashboard.

## How It Works

### Data Flow
1. **Meta API** → ETL Process → **Supabase Database**
2. **Supabase** → Dashboard API → **React Frontend**
3. **Auto-refresh** keeps display updated every 5 minutes
4. **Hourly ETL** keeps database current with Meta Ads

### ETL Optimization
- Reduced data window from 30 to 3 days
- Incremental updates via upsert operations
- Parallel account processing
- Rate limiting and error handling

### Dashboard Updates
- React hooks manage refresh intervals
- API endpoints cache responses
- Optimistic UI updates during syncs
- Error boundaries for graceful failures

## Manual Commands

### Run ETL Manually
```bash
# Sync last 3 days (default)
node run-standardized-etl.js

# Sync last 7 days
node run-standardized-etl.js --days 7

# Sync yesterday only
node run-standardized-etl.js --days 1
```

### Check ETL Status
```bash
# View cron jobs
crontab -l

# Check last sync
cat logs/last-successful-sync.txt

# View recent logs
tail -f logs/etl-*.log
```

### Dashboard API Endpoints

- `GET /api/metrics` - Fetch aggregated metrics
- `GET /api/campaigns` - Get campaign data
- `POST /api/sync` - Trigger ETL sync
- `GET /api/sync` - Check sync status

## Configuration

### Environment Variables
Add to `.env` if needed:
```env
# Optional: Slack webhook for ETL notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Adjust Sync Frequency
Edit `schedule-etl.sh` or update crontab:
```bash
# Every 30 minutes
*/30 * * * * /path/to/schedule-etl.sh

# Every 2 hours
0 */2 * * * /path/to/schedule-etl.sh
```

### Change Data Window
Edit sync window in `run-standardized-etl.js`:
```javascript
// Default is 3 days, adjust as needed
let daysBack = 3;
```

## Monitoring

### Key Metrics to Watch
- **Data Freshness**: Should be < 2 hours old
- **ETL Duration**: Typically 1-3 minutes
- **API Rate Limits**: Meta allows ~200 calls/hour
- **Database Size**: Monitor Supabase usage

### Troubleshooting

**Data not updating?**
1. Check cron job: `crontab -l`
2. View ETL logs: `tail logs/etl-*.log`
3. Test manual sync: `node run-standardized-etl.js`
4. Verify Meta API token is valid

**Dashboard not refreshing?**
1. Check browser console for errors
2. Verify auto-refresh is enabled
3. Try manual refresh button
4. Check network tab for API calls

**Sync button not working?**
1. Check if another sync is running
2. Wait 1 minute between syncs (rate limit)
3. Verify Node.js process can be spawned
4. Check API endpoint logs

## Performance Tips

1. **Optimize Queries**: Add database indexes for frequently queried fields
2. **Use Caching**: Implement Redis for API response caching
3. **Batch Updates**: Process multiple accounts in parallel
4. **Monitor Usage**: Track Supabase and Meta API limits
5. **Archive Old Data**: Move data > 90 days to archive tables

## Future Enhancements

Consider these upgrades for even better real-time performance:

1. **WebSocket Connections**: Replace polling with WebSocket for instant updates
2. **Meta Webhooks**: When available, use webhooks for immediate data push
3. **Queue System**: Implement Bull/BullMQ for reliable job processing
4. **Microservices**: Separate ETL, API, and frontend services
5. **GraphQL Subscriptions**: Real-time data subscriptions
6. **Distributed ETL**: Run ETL workers across multiple servers
7. **ML Predictions**: Predict metrics between syncs

## Support

- Check logs in `/logs` directory
- ETL issues: Review `run-standardized-etl.js`
- Dashboard issues: Check browser console
- Database issues: Verify Supabase connection

---

**Last Updated**: September 2024
**Status**: ✅ Real-Time Updates Active