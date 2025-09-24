#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPTools } from './tools';
import { testConnection } from '../database/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class MetaMCPServer {
  private server: Server;
  private tools: MCPTools;

  constructor() {
    this.server = new Server(
      {
        name: env.mcp.serverName,
        version: env.mcp.serverVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new MCPTools();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      
      return {
        tools: this.tools.getToolDefinitions(),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Tool execution requested', { 
        tool: name, 
        args: this.sanitizeArgs(args),
      });

      try {
        let result: any;

        switch (name) {
          case 'get_spend':
            result = await this.tools.executeGetSpend(args);
            break;
          
          case 'get_roas':
            result = await this.tools.executeGetRoas(args);
            break;
          
          case 'best_ad':
            result = await this.tools.executeBestAd(args);
            break;
          
          case 'campaign_performance':
            result = await this.tools.executeCampaignPerformance(args);
            break;
          
          case 'audience_insights':
            result = await this.tools.executeAudienceInsights(args);
            break;
          
          case 'trend_analysis':
            result = await this.tools.executeTrendAnalysis(args);
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        logger.info('Tool execution completed', { 
          tool: name,
          success: true,
          resultSize: JSON.stringify(result).length,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error('Tool execution failed', error as Error, { 
          tool: name, 
          args: this.sanitizeArgs(args),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Tool execution failed',
                tool: name,
                message: errorMessage,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }
    });
  }

  private sanitizeArgs(args: any): any {
    // Remove potentially sensitive information from logs
    const sanitized = { ...args };
    
    // Remove or mask sensitive fields if any
    const sensitiveFields = ['access_token', 'api_key', 'password'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Meta MCP Server', {
        name: env.mcp.serverName,
        version: env.mcp.serverVersion,
        nodeEnv: env.app.nodeEnv,
      });

      // Test database connection before starting
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Meta MCP Server started successfully', {
        transport: 'stdio',
        capabilities: ['tools'],
      });

      // Keep the process alive
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to start Meta MCP Server', error as Error);
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const server = new MetaMCPServer();
  await server.start();
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
  });
}

export default MetaMCPServer;