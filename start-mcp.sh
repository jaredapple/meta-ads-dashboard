#!/bin/bash

# Meta MCP Server Startup Script for Claude Desktop
# This script ensures the MCP server starts correctly with proper environment and error handling

# Exit on any error
set -e

# Debug information (will appear in Claude Desktop logs)
echo "Starting Meta MCP Server..." >&2
echo "Current directory: $(pwd)" >&2
echo "Node version: $(node --version 2>/dev/null || echo 'Node not found')" >&2
echo "NPM version: $(npm --version 2>/dev/null || echo 'NPM not found')" >&2

# Set up environment
export NODE_ENV=production
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Change to project directory
PROJECT_DIR="/Users/jaredapplebaum/Desktop/Meta MCP"
cd "$PROJECT_DIR" || {
    echo "Error: Cannot change to project directory: $PROJECT_DIR" >&2
    exit 1
}

echo "Changed to directory: $(pwd)" >&2
echo "Package.json exists: $(test -f package.json && echo 'yes' || echo 'no')" >&2

# Verify required files exist
if [ ! -f package.json ]; then
    echo "Error: package.json not found in $PROJECT_DIR" >&2
    exit 1
fi

if [ ! -f src/mcp/server.ts ]; then
    echo "Error: src/mcp/server.ts not found" >&2
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found, environment variables may not be loaded" >&2
fi

echo "Starting MCP server with ts-node..." >&2

# Start the MCP server using npx to ensure we get the right version
exec npx ts-node src/mcp/server.ts