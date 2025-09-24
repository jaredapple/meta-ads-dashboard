#!/bin/bash

# Meta MCP Real-Time ETL Setup Script
# This script helps set up hourly ETL syncs for near real-time dashboard updates

echo "🚀 Meta MCP Real-Time ETL Setup"
echo "================================"
echo ""

PROJECT_DIR="/Users/jaredapplebaum/Desktop/Meta MCP"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "Please update the PROJECT_DIR variable in this script"
    exit 1
fi

# Make schedule-etl.sh executable
chmod +x "$PROJECT_DIR/schedule-etl.sh"

echo "📋 Current ETL Configuration:"
echo "  - Data sync window: Last 3 days (optimized for real-time)"
echo "  - Default sync frequency: Hourly"
echo "  - Dashboard auto-refresh: Every 5 minutes"
echo "  - Manual sync: Available via dashboard 'Sync Data Now' button"
echo ""

# Check if cron job already exists
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -c "schedule-etl.sh")

if [ $CRON_EXISTS -gt 0 ]; then
    echo "⚠️  An ETL cron job already exists in your crontab."
    echo ""
    read -p "Would you like to view your current cron jobs? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Current cron jobs:"
        crontab -l | grep -E "(schedule-etl|Meta MCP)" || echo "No Meta MCP related jobs found"
        echo ""
    fi
else
    echo "📝 No existing ETL cron job found."
fi

echo ""
echo "Choose your ETL sync frequency:"
echo "  1) Every hour (recommended for real-time)"
echo "  2) Every 30 minutes (more frequent updates)"
echo "  3) Every 2 hours (less frequent, lower API usage)"
echo "  4) Every 6 hours (batch updates)"
echo "  5) Once daily at 6 AM"
echo "  6) Custom schedule"
echo "  0) Skip cron setup (manual sync only)"
echo ""

read -p "Enter your choice (0-6): " choice

CRON_SCHEDULE=""
SCHEDULE_DESC=""

case $choice in
    1)
        CRON_SCHEDULE="0 * * * *"
        SCHEDULE_DESC="every hour"
        ;;
    2)
        CRON_SCHEDULE="*/30 * * * *"
        SCHEDULE_DESC="every 30 minutes"
        ;;
    3)
        CRON_SCHEDULE="0 */2 * * *"
        SCHEDULE_DESC="every 2 hours"
        ;;
    4)
        CRON_SCHEDULE="0 */6 * * *"
        SCHEDULE_DESC="every 6 hours"
        ;;
    5)
        CRON_SCHEDULE="0 6 * * *"
        SCHEDULE_DESC="daily at 6 AM"
        ;;
    6)
        echo ""
        echo "Enter custom cron schedule (e.g., '0 * * * *' for hourly):"
        read -p "Cron schedule: " CRON_SCHEDULE
        SCHEDULE_DESC="custom schedule"
        ;;
    0)
        echo ""
        echo "✅ Skipping cron setup. You can manually sync data using:"
        echo "  - Dashboard: Click 'Sync Data Now' button"
        echo "  - Command line: node run-standardized-etl.js"
        echo ""
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

if [ ! -z "$CRON_SCHEDULE" ]; then
    echo ""
    echo "📅 Setting up cron job to run $SCHEDULE_DESC"
    echo "   Schedule: $CRON_SCHEDULE"
    echo ""
    
    # Create the cron job entry
    CRON_JOB="$CRON_SCHEDULE $PROJECT_DIR/schedule-etl.sh"
    
    # Add to crontab
    (crontab -l 2>/dev/null | grep -v "schedule-etl.sh"; echo "$CRON_JOB") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job successfully configured!"
        echo ""
        echo "The ETL will now run $SCHEDULE_DESC"
        echo ""
    else
        echo "❌ Failed to set up cron job"
        echo ""
        echo "You can manually add this line to your crontab:"
        echo "$CRON_JOB"
        echo ""
    fi
fi

# Test ETL execution
echo "Would you like to run a test ETL sync now? (y/n) "
read -p "" -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 Running test ETL sync (last 3 days)..."
    cd "$PROJECT_DIR"
    node run-standardized-etl.js --days 3
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Test sync completed successfully!"
    else
        echo ""
        echo "⚠️  Test sync encountered issues. Please check the configuration."
    fi
fi

echo ""
echo "📊 Real-Time ETL Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Your dashboard now auto-refreshes every 5 minutes"
echo "2. ETL runs $SCHEDULE_DESC to fetch new data"
echo "3. Use 'Sync Data Now' button for immediate updates"
echo "4. Monitor logs in: $PROJECT_DIR/logs/"
echo ""
echo "To check ETL status:"
echo "  crontab -l | grep schedule-etl"
echo ""
echo "To view recent ETL logs:"
echo "  tail -f $PROJECT_DIR/logs/etl-*.log"
echo ""
echo "Happy monitoring! 🎉"