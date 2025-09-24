import dotenv from 'dotenv';

// Suppress dotenv console output to avoid stdout pollution that breaks MCP JSON protocol
const originalConsoleLog = console.log;
console.log = () => {}; // Temporarily disable console.log
dotenv.config();
console.log = originalConsoleLog; // Restore console.log

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  meta: {
    accessToken: string;
    appId: string;
    appSecret: string;
    accountId: string;
    // New: Support for system user token that has access to multiple accounts
    systemUserToken?: string;
  };
  app: {
    nodeEnv: string;
    defaultTimezone: string;
    defaultCurrency: string;
    etlSchedule: string;
    // New: Encryption key for securing access tokens
    encryptionKey?: string;
  };
  mcp: {
    serverName: string;
    serverVersion: string;
  };
}

function validateEnv(): EnvironmentConfig {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'META_ACCESS_TOKEN',
    'META_APP_ID',
    'META_APP_SECRET',
    'META_ACCOUNT_ID',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    supabase: {
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    meta: {
      accessToken: process.env.META_ACCESS_TOKEN!,
      appId: process.env.META_APP_ID!,
      appSecret: process.env.META_APP_SECRET!,
      accountId: process.env.META_ACCOUNT_ID!,
      systemUserToken: process.env.META_SYSTEM_USER_TOKEN,
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      defaultTimezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
      defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
      etlSchedule: process.env.ETL_SCHEDULE || '0 6 * * *',
      encryptionKey: process.env.ENCRYPTION_KEY,
    },
    mcp: {
      serverName: process.env.MCP_SERVER_NAME || 'meta-ads-server',
      serverVersion: process.env.MCP_SERVER_VERSION || '1.0.0',
    },
  };
}

export const env = validateEnv();