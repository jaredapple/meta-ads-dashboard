# Meta MCP Server

A Node.js + TypeScript project that connects to the Meta Marketing API, stores daily ad-level insights in Supabase (PostgreSQL), and exposes them through an MCP server for natural language queries.

## Features

- **ETL Pipeline**: Scheduled data ingestion from Meta Marketing API to Supabase
- **Normalized Schema**: Proper dimension and fact tables (no raw JSON blobs)
- **MCP Server**: Natural language querying with tools like `get_spend`, `get_roas`, `best_ad`
- **Performance**: Database-only queries (no live API calls) for fast responses
- **Testing**: Seed script with example data for development without hitting Meta API

## Quick Start

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development**
   ```bash
   npm run dev          # Start development server
   npm run etl          # Run ETL pipeline once
   npm run mcp          # Start MCP server
   npm run seed         # Populate with test data
   ```

4. **Build & Production**
   ```bash
   npm run build        # Compile TypeScript
   npm start            # Run production server
   ```

## Architecture

```
src/
├── config/           # Environment configuration
├── database/         # Supabase client, migrations, types  
├── etl/             # Meta API integration and data pipeline
├── mcp/             # MCP server and tools implementation
├── services/        # Business logic and data access
├── utils/           # Shared utilities
└── scripts/         # Seed data and maintenance
```

## Database Schema

- **Dimension Tables**: `accounts`, `campaigns`, `ad_sets`, `ads`
- **Fact Table**: `daily_ad_insights` with metrics (spend, impressions, clicks, conversions)
- **Proper Relations**: Foreign keys and indexing for performance

## MCP Tools

- `get_spend(date_range, filters?)` - Analyze spending across date ranges
- `get_roas(date_range, filters?)` - Calculate Return on Ad Spend  
- `best_ad(metric, date_range, limit?)` - Find top performing ads

Date ranges support formats like:
- `"last_7d"`, `"yesterday"`, `"last_30d"`
- `"2025-01-01,2025-01-31"` (custom ranges)

## Development

```bash
npm run lint         # Check code style
npm run test         # Run test suite
npm run format       # Format code with Prettier
```