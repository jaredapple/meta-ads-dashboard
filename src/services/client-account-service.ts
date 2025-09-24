import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { encryptToken, decryptToken } from '../utils/encryption';
import { 
  ClientAccount, 
  ClientAccountCreate, 
  ClientAccountUpdate,
  ActiveClientAccount 
} from '../database/client-types';

export class ClientAccountService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      env.supabase.url,
      env.supabase.serviceRoleKey
    );
  }

  /**
   * Get all client accounts (tokens are decrypted)
   */
  async getAllAccounts(): Promise<ClientAccount[]> {
    try {
      const { data, error } = await this.supabase
        .from('client_accounts')
        .select('*')
        .order('client_name');

      if (error) {
        throw error;
      }

      // Decrypt access tokens
      return (data || []).map(account => ({
        ...account,
        access_token: this.decryptSafely(account.access_token),
        refresh_token: account.refresh_token ? this.decryptSafely(account.refresh_token) : null
      }));
    } catch (error) {
      logger.error('Failed to get client accounts', error as Error);
      throw error;
    }
  }

  /**
   * Get only active client accounts
   */
  async getActiveAccounts(): Promise<ActiveClientAccount[]> {
    try {
      const { data, error } = await this.supabase
        .from('active_client_accounts')
        .select('*')
        .order('client_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get active client accounts', error as Error);
      throw error;
    }
  }

  /**
   * Get a specific client account by ID
   */
  async getAccountById(id: string): Promise<ClientAccount | null> {
    try {
      const { data, error } = await this.supabase
        .from('client_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      if (data) {
        return {
          ...data,
          access_token: this.decryptSafely(data.access_token),
          refresh_token: data.refresh_token ? this.decryptSafely(data.refresh_token) : null
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get client account ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Get a client account by Meta account ID
   */
  async getAccountByMetaId(metaAccountId: string): Promise<ClientAccount | null> {
    try {
      const { data, error } = await this.supabase
        .from('client_accounts')
        .select('*')
        .eq('meta_account_id', metaAccountId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      if (data) {
        return {
          ...data,
          access_token: this.decryptSafely(data.access_token),
          refresh_token: data.refresh_token ? this.decryptSafely(data.refresh_token) : null
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get client account by Meta ID ${metaAccountId}`, error as Error);
      throw error;
    }
  }

  /**
   * Create a new client account
   */
  async createAccount(account: ClientAccountCreate): Promise<ClientAccount> {
    try {
      // Encrypt sensitive tokens
      const encryptedAccount = {
        ...account,
        access_token: encryptToken(account.access_token),
        refresh_token: account.refresh_token ? encryptToken(account.refresh_token) : null,
        timezone: account.timezone || env.app.defaultTimezone,
        currency: account.currency || env.app.defaultCurrency,
        is_active: account.is_active !== undefined ? account.is_active : true,
        is_system_user: account.is_system_user || false
      };

      const { data, error } = await this.supabase
        .from('client_accounts')
        .insert(encryptedAccount)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Return with decrypted tokens
      return {
        ...data,
        access_token: account.access_token,
        refresh_token: account.refresh_token || null
      };
    } catch (error) {
      logger.error('Failed to create client account', error as Error);
      throw error;
    }
  }

  /**
   * Update a client account
   */
  async updateAccount(id: string, updates: ClientAccountUpdate): Promise<ClientAccount> {
    try {
      // Encrypt tokens if they're being updated
      const encryptedUpdates = { ...updates };
      if (updates.access_token) {
        encryptedUpdates.access_token = encryptToken(updates.access_token);
      }
      if (updates.refresh_token) {
        encryptedUpdates.refresh_token = encryptToken(updates.refresh_token);
      }

      const { data, error } = await this.supabase
        .from('client_accounts')
        .update(encryptedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Return with decrypted tokens
      return {
        ...data,
        access_token: this.decryptSafely(data.access_token),
        refresh_token: data.refresh_token ? this.decryptSafely(data.refresh_token) : null
      };
    } catch (error) {
      logger.error(`Failed to update client account ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete a client account
   */
  async deleteAccount(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('client_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to delete client account ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Update sync status for an account
   */
  async updateSyncStatus(
    id: string, 
    status: 'pending' | 'syncing' | 'success' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      const updates: ClientAccountUpdate = {
        sync_status: status,
        sync_error: error || null
      };

      if (status === 'success') {
        updates.last_sync_at = new Date();
      }

      await this.updateAccount(id, updates);
    } catch (error) {
      logger.error(`Failed to update sync status for account ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Migrate existing account from environment variables
   */
  async migrateExistingAccount(): Promise<void> {
    try {
      // Check if we already have this account
      const existing = await this.getAccountByMetaId(env.meta.accountId);
      if (existing) {
        logger.info('Account already migrated', { accountId: env.meta.accountId });
        return;
      }

      // Create account from environment variables
      await this.createAccount({
        client_name: 'Aura House',
        meta_account_id: env.meta.accountId,
        access_token: env.meta.accessToken,
        timezone: env.app.defaultTimezone,
        currency: env.app.defaultCurrency,
        business_name: 'Aura House',
        is_active: true,
        is_system_user: false
      });

      logger.info('Successfully migrated existing account', { accountId: env.meta.accountId });
    } catch (error) {
      logger.error('Failed to migrate existing account', error as Error);
      throw error;
    }
  }

  /**
   * Helper to safely decrypt tokens
   */
  private decryptSafely(encryptedToken: string): string {
    try {
      if (!encryptedToken) {
        return '';
      }
      // Check if token is already decrypted (for backward compatibility)
      if (encryptedToken.startsWith('EA') || encryptedToken.includes('|')) {
        return encryptedToken; // Likely already a plain token
      }
      return decryptToken(encryptedToken);
    } catch (error) {
      logger.warn('Failed to decrypt token, returning as-is', { error: (error as Error).message });
      return encryptedToken;
    }
  }
}

// Singleton instance
let clientAccountService: ClientAccountService | null = null;

export function getClientAccountService(): ClientAccountService {
  if (!clientAccountService) {
    clientAccountService = new ClientAccountService();
  }
  return clientAccountService;
}