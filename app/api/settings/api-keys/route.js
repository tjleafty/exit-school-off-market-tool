import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

// GET - Retrieve all API keys
export async function GET() {
  try {
    // Try to select with JWT fields first (if migration has run)
    let { data, error } = await supabase
      .from('api_keys')
      .select('service, encrypted_key, username, client_id, status, created_at')
      .order('service')

    // If error due to missing columns, fall back to basic fields
    if (error && error.message?.includes('column')) {
      console.log('JWT columns not yet available, using basic fields')
      const fallback = await supabase
        .from('api_keys')
        .select('service, encrypted_key, status, created_at')
        .order('service')

      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

// POST - Save or update an API key
export async function POST(request) {
  try {
    const body = await request.json()
    const { service, encrypted_key, username, client_id, status = 'Saved' } = body

    if (!service || !encrypted_key) {
      return NextResponse.json(
        { error: 'Service and API key are required' },
        { status: 400 }
      )
    }

    // Prepare upsert data - include username and client_id if provided
    const upsertData = {
      service,
      encrypted_key,
      status,
      updated_at: new Date().toISOString()
    }

    // Add optional JWT auth fields if provided (for services like ZoomInfo)
    // Only add if the columns exist in the database
    if (username !== undefined) upsertData.username = username
    if (client_id !== undefined) upsertData.client_id = client_id

    // Use upsert to update if exists, insert if not
    let { data, error } = await supabase
      .from('api_keys')
      .upsert(upsertData, { onConflict: 'service' })
      .select()

    // If error due to missing columns, try without JWT fields
    if (error && error.message?.includes('column')) {
      console.log('JWT columns not yet available, saving without them')
      const basicData = {
        service,
        encrypted_key,
        status,
        updated_at: new Date().toISOString()
      }

      const retry = await supabase
        .from('api_keys')
        .upsert(basicData, { onConflict: 'service' })
        .select()

      data = retry.data
      error = retry.error
    }

    if (error) throw error

    return NextResponse.json({
      message: 'API key saved successfully',
      data
    })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

// PUT - Update API key status only
export async function PUT(request) {
  try {
    const body = await request.json()
    const { service, status } = body
    
    if (!service || !status) {
      return NextResponse.json(
        { error: 'Service and status are required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('api_keys')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('service', service)
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ 
      message: 'API key status updated successfully',
      data 
    })
  } catch (error) {
    console.error('Error updating API key status:', error)
    return NextResponse.json(
      { error: 'Failed to update API key status' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an API key
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { service } = body
    
    if (!service) {
      return NextResponse.json(
        { error: 'Service is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('service', service)
    
    if (error) throw error
    
    return NextResponse.json({ 
      message: 'API key removed successfully'
    })
  } catch (error) {
    console.error('Error removing API key:', error)
    return NextResponse.json(
      { error: 'Failed to remove API key' },
      { status: 500 }
    )
  }
}