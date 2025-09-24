-- Migration: Add client_accounts table for multi-account support
-- This table stores configuration for multiple Meta ad accounts

-- Create client_accounts table
CREATE TABLE IF NOT EXISTS client_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    meta_account_id VARCHAR(50) NOT NULL UNIQUE,
    access_token TEXT NOT NULL, -- Will be encrypted at application layer
    refresh_token TEXT, -- For OAuth flow if implemented
    token_expires_at TIMESTAMPTZ,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_user BOOLEAN NOT NULL DEFAULT false, -- Track if using system user token
    
    -- Business information
    business_name TEXT,
    business_id VARCHAR(50),
    
    -- Contact information
    contact_email TEXT,
    contact_name TEXT,
    
    -- Usage tracking
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, syncing, success, failed
    sync_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255), -- For future multi-user support
    
    CONSTRAINT unique_meta_account UNIQUE(meta_account_id)
);

-- Create indexes for performance
CREATE INDEX idx_client_accounts_active ON client_accounts(is_active);
CREATE INDEX idx_client_accounts_meta_id ON client_accounts(meta_account_id);
CREATE INDEX idx_client_accounts_sync_status ON client_accounts(sync_status);

-- Add trigger for updated_at
CREATE TRIGGER update_client_accounts_updated_at 
    BEFORE UPDATE ON client_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration: Update accounts table to link with client_accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_accounts_client_account ON accounts(client_account_id);

-- Create view for easy access to active accounts with their configuration
CREATE OR REPLACE VIEW active_client_accounts AS
SELECT 
    ca.id,
    ca.client_name,
    ca.meta_account_id,
    ca.timezone,
    ca.currency,
    ca.business_name,
    ca.last_sync_at,
    ca.sync_status,
    a.id as account_table_id,
    a.name as account_name
FROM client_accounts ca
LEFT JOIN accounts a ON a.id = ca.meta_account_id
WHERE ca.is_active = true
ORDER BY ca.client_name;

-- Insert current account as the first client (Aura House)
-- This will be populated from environment variables initially
INSERT INTO client_accounts (
    client_name,
    meta_account_id,
    access_token,
    timezone,
    currency,
    business_name,
    is_active,
    sync_status
) VALUES (
    'Aura House',
    'PLACEHOLDER_ACCOUNT_ID', -- Will be replaced with actual account ID from env
    'PLACEHOLDER_TOKEN', -- Will be replaced with actual token from env
    'America/New_York',
    'USD',
    'Aura House',
    true,
    'pending'
) ON CONFLICT (meta_account_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE client_accounts IS 'Stores configuration for multiple Meta ad accounts managed by the agency';
COMMENT ON COLUMN client_accounts.access_token IS 'Encrypted Meta API access token - encryption handled at application layer';
COMMENT ON COLUMN client_accounts.is_system_user IS 'True if using Business Manager system user token with access to multiple accounts';
COMMENT ON COLUMN client_accounts.sync_status IS 'Current ETL sync status: pending, syncing, success, or failed';