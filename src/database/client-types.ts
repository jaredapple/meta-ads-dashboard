// Type definitions for client account management

export interface ClientAccount {
  id: string;
  client_name: string;
  meta_account_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: Date;
  timezone: string;
  currency: string;
  is_active: boolean;
  is_system_user: boolean;
  business_name?: string;
  business_id?: string;
  contact_email?: string;
  contact_name?: string;
  last_sync_at?: Date;
  sync_status: 'pending' | 'syncing' | 'success' | 'failed';
  sync_error?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface ClientAccountCreate {
  client_name: string;
  meta_account_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: Date;
  timezone?: string;
  currency?: string;
  is_active?: boolean;
  is_system_user?: boolean;
  business_name?: string;
  business_id?: string;
  contact_email?: string;
  contact_name?: string;
}

export interface ClientAccountUpdate {
  client_name?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  timezone?: string;
  currency?: string;
  is_active?: boolean;
  business_name?: string;
  business_id?: string;
  contact_email?: string;
  contact_name?: string;
  sync_status?: 'pending' | 'syncing' | 'success' | 'failed';
  sync_error?: string;
  last_sync_at?: Date;
}

export interface ActiveClientAccount {
  id: string;
  client_name: string;
  meta_account_id: string;
  timezone: string;
  currency: string;
  business_name?: string;
  last_sync_at?: Date;
  sync_status: string;
  account_table_id?: string;
  account_name?: string;
}