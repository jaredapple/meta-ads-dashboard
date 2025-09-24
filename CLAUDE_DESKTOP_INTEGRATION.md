# Claude Desktop Integration Guide

## Setup Complete ✅

Your Meta MCP server is now configured to work with Claude Desktop! You can query your Meta ads data using natural language.

## Available Tools

The MCP server provides 7 powerful tools for analyzing your Meta ads data:

1. **get_spend** - Analyze advertising spend with daily breakdowns
2. **get_roas** - Calculate Return on Ad Spend 
3. **best_ad** - Find top-performing ads by any metric
4. **campaign_performance** - Comprehensive campaign analysis
5. **audience_insights** - Demographic performance breakdowns
6. **trend_analysis** - Period-over-period comparisons
7. **analyze_video_ads** - ✨ NEW: Video ad hook and retention analysis with AI recommendations

## Natural Language Query Examples

### 📊 Spend Analysis
- "How much did I spend on ads last week?"
- "Show me my daily ad spend for the past 7 days"
- "What's my total advertising spend for this month so far?"
- "Break down my spend by campaign for yesterday"

### 🎯 Performance Analysis
- "Which are my best performing ads by ROAS this month?"
- "Find my top 5 campaigns by spend in the last 30 days"
- "Show me ads with the highest click-through rate last week"
- "Which campaigns have the lowest cost per click?"

### 📈 Trend Analysis
- "How does this week's ad performance compare to last week?"
- "Show me the trend in my click-through rates over time"
- "Is my ROAS improving or declining compared to last month?"
- "Compare my spend between the first and second half of this month"

### 👥 Audience Insights
- "Which age groups are performing best for my ads?"
- "Break down my ad performance by gender and age"
- "Show me demographic insights for my top campaign"
- "How do different locations perform for my ads?"

### 🔍 Specific Queries
- "What was my ROAS for the ACQ campaigns last week?"
- "Show me which ads performed best by conversion rate yesterday"
- "How do my male vs female audiences compare in terms of spend?"
- "Find ads spending more than $100 per day with low ROAS"

### 🎬 Video Ad Analysis (NEW!)
- "Analyze my video ads for hook performance and retention"
- "Which videos have the strongest hooks (thumbstop rates)?"
- "Show me videos losing viewers after 15 seconds"
- "What video recommendations do you have for improving performance?"
- "Find video ads with good retention but weak completion rates"
- "Which video creatives should I scale up or pause?"

## ✅ Fixed Configuration

**All issues have been resolved!** 
- ✅ Directory and environment setup fixed with robust shell script
- ✅ JSON parsing errors fixed by suppressing dotenv stdout pollution
- ✅ MCP protocol communication now clean and functional

## Troubleshooting

### Current Configuration:
```json
"meta-ads": {
  "command": "/Users/jaredapplebaum/Desktop/Meta MCP/start-mcp.sh"
}
```

### If MCP Server Still Doesn't Connect:
1. **Restart Claude Desktop** completely (Quit and reopen)
2. **Check logs** at: `~/Library/Logs/Claude/mcp-server-meta-ads.log`
3. **Verify script permissions**: Ensure start-mcp.sh is executable
4. **Try alternative configs** from `claude-desktop-config-backup.json`

### Debug Information:
The shell script now provides detailed debug output in the Claude Desktop logs:
- Current directory verification
- Node/NPM version checks  
- File existence confirmation
- Environment setup status

### If Queries Don't Work:
- Make sure to ask questions about your Meta ads data specifically
- Try simpler queries first like "How much did I spend on ads yesterday?"
- Check that your .env file is properly configured

## Data Available

Your MCP server has access to real data from your Aura House account:
- **1 Account**: Aura House (ID: 183121914746855)
- **17 Campaigns**: Including scaling and acquisition campaigns
- **109 Ad Sets**: Real Meta ad set IDs
- **663 Ads**: Complete ad performance data
- **Daily Insights**: Performance metrics and conversion data

## Configuration Files

- **Claude Desktop Config**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **MCP Server**: Configured as "meta-ads" server
- **Working Directory**: `/Users/jaredapplebaum/Desktop/Meta MCP`

Enjoy querying your Meta ads data with natural language in Claude Desktop! 🚀