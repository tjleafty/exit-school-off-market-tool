import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// GET all users
export async function GET() {
  try {
    console.log('GET /api/users - Fetching users from database')
    
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true })

    console.log('Supabase GET response:', { data, error })

    if (error) throw error

    return NextResponse.json({ users: data })
  } catch (error) {
    console.error('Error fetching users:', error)
    console.error('Error details:', error.message, error.details, error.hint)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request) {
  try {
    console.log('POST /api/users - Starting user creation')
    const body = await request.json()
    console.log('Request body:', body)
    
    const userData = {
      email: body.email,
      name: body.name,
      role: body.role || 'USER',
      status: body.status || 'ACTIVE',
      method: body.method || 'MANUAL',
      has_password: body.hasPassword || false,
      features: body.features || {
        companySearch: true,
        companyEnrichment: true,
        businessIntelligence: true
      },
      created_by: body.createdBy || 'Admin',
      join_date: new Date().toISOString().split('T')[0]
    }
    
    console.log('User data to insert:', userData)
    
    const { data, error } = await supabase
      .from('app_users')
      .insert([userData])
      .select()

    console.log('Supabase response:', { data, error })

    if (error) throw error

    return NextResponse.json({ user: data[0] })
  } catch (error) {
    console.error('Error creating user:', error)
    console.error('Error details:', error.message, error.details, error.hint)
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    )
  }
}

// PUT update user
export async function PUT(request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('app_users')
      .update({
        email: body.email,
        name: body.name,
        role: body.role,
        status: body.status,
        features: body.features,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()

    if (error) throw error

    return NextResponse.json({ user: data[0] })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', userId)
      .neq('method', 'SYSTEM') // Prevent deleting system user

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}