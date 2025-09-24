import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    // Get accounts from the accounts table
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    // Format the response to match the ClientAccount interface
    const formattedAccounts = (accounts || []).map(account => ({
      id: account.id,
      clientName: account.name,
      metaAccountId: account.id,
      accountName: account.name,
      businessName: account.name,
      timezone: account.timezone,
      currency: account.currency,
      lastSyncAt: account.updated_at,
      syncStatus: 'success',
    }));

    return NextResponse.json({
      accounts: formattedAccounts,
      count: formattedAccounts.length,
    });
  } catch (error) {
    console.error('Error in accounts endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.clientName || !body.metaAccountId || !body.accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, metaAccountId, accessToken' },
        { status: 400 }
      );
    }

    // Note: In production, you'd want to encrypt the access token server-side
    // For now, we'll store it as-is (the database migration expects encryption at app layer)
    
    const { data, error } = await supabase
      .from('client_accounts')
      .insert({
        client_name: body.clientName,
        meta_account_id: body.metaAccountId,
        access_token: body.accessToken, // Should be encrypted in production
        timezone: body.timezone || 'America/New_York',
        currency: body.currency || 'USD',
        business_name: body.businessName,
        business_id: body.businessId,
        contact_email: body.contactEmail,
        contact_name: body.contactName,
        is_active: body.isActive !== undefined ? body.isActive : true,
        is_system_user: body.isSystemUser || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'An account with this Meta Account ID already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: {
        id: data.id,
        clientName: data.client_name,
        metaAccountId: data.meta_account_id,
      }
    });
  } catch (error) {
    console.error('Error in create account endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    // Only update fields that are provided
    if (body.clientName !== undefined) updateData.client_name = body.clientName;
    if (body.accessToken !== undefined) updateData.access_token = body.accessToken; // Should be encrypted
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.businessName !== undefined) updateData.business_name = body.businessName;
    if (body.businessId !== undefined) updateData.business_id = body.businessId;
    if (body.contactEmail !== undefined) updateData.contact_email = body.contactEmail;
    if (body.contactName !== undefined) updateData.contact_name = body.contactName;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const { data, error } = await supabase
      .from('client_accounts')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      return NextResponse.json(
        { error: 'Failed to update account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: {
        id: data.id,
        clientName: data.client_name,
        metaAccountId: data.meta_account_id,
      }
    });
  } catch (error) {
    console.error('Error in update account endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('client_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete account endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}