import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      env.supabase.url,
      env.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    logger.info('Supabase client initialized');
  }

  return supabaseClient;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('accounts')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      logger.error('Database connection test failed', error);
      return false;
    }

    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', error as Error);
    return false;
  }
}