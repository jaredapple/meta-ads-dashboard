#!/bin/bash

# Meta MCP ETL Scheduling Script
# This script can be used with cron to run hourly ETL jobs for near real-time updates

# Exit on any error
set -e

# Set up environment
export NODE_ENV=production
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Change to project directory
PROJECT_DIR="/Users/jaredapplebaum/Desktop/Meta MCP"
cd "$PROJECT_DIR"

# Log file with hourly timestamp
LOG_FILE="$PROJECT_DIR/logs/etl-$(date +%Y%m%d-%H).log"
mkdir -p "$PROJECT_DIR/logs"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting hourly ETL sync job"
log "Mode: Near real-time data sync (last 3 days)"

# Run the standardized ETL service
# This fetches the last 3 days of data for incremental updates
if node run-standardized-etl.js >> "$LOG_FILE" 2>&1; then
    log "ETL sync completed successfully"
    
    # Update last sync timestamp
    echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$PROJECT_DIR/logs/last-successful-sync.txt"
    
    # Clean up old log files (keep last 7 days for hourly logs)
    find "$PROJECT_DIR/logs" -name "etl-*.log" -mtime +7 -delete 2>/dev/null || true
    
    exit 0
else
    EXIT_CODE=$?
    log "ETL sync failed with exit code $EXIT_CODE"
    
    # Send notification if configured
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"⚠️ Meta MCP ETL sync failed at $(date '+%Y-%m-%d %H:%M:%S') with exit code $EXIT_CODE\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    exit $EXIT_CODE
fi