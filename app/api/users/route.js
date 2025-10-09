import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { createHash } from 'crypto'

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

// GET all users
export async function GET() {
  try {
    console.log('GET /api/users - Fetching users from database')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    console.log('Supabase GET response:', { data, error })

    if (error) throw error

    // Map users table fields to app_users format for backwards compatibility
    const mappedUsers = data.map(user => ({
      ...user,
      name: user.full_name || user.email.split('@')[0], // Map full_name to name
      method: 'MANUAL', // Default method since users table doesn't track this
      join_date: user.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      last_login: user.last_seen || null,
      has_password: true // All auth users have passwords
    }))

    return NextResponse.json({ users: mappedUsers })
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password || Math.random().toString(36).slice(-8), // Generate random password for invited users
      email_confirm: true, // Auto-confirm email for manually created users
      user_metadata: {
        full_name: body.name,
        role: body.role || 'USER',
        features: body.features || {
          companySearch: true,
          companyEnrichment: true,
          businessIntelligence: true
        }
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    console.log('Auth user created:', authData.user.id)

    // Wait a moment for the trigger to create the user record
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update the users table with additional info using upsert
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: body.email,
        full_name: body.name,
        role: body.role || 'USER',
        status: body.status || 'ACTIVE',
        metadata: {
          features: body.features || {
            companySearch: true,
            companyEnrichment: true,
            businessIntelligence: true
          },
          method: body.method || 'MANUAL',
          created_by: body.createdBy || 'Admin'
        }
      }, {
        onConflict: 'id'
      })
      .select()

    console.log('Users table upsert response:', { data, error })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Map back to expected format for the frontend
    const newUser = {
      ...data[0],
      name: data[0].full_name,
      method: data[0].metadata?.method || 'MANUAL',
      join_date: data[0].created_at?.split('T')[0],
      last_login: data[0].last_seen,
      has_password: true,
      features: data[0].metadata?.features
    }

    return NextResponse.json({ user: newUser })
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
      .from('users')
      .update({
        email: body.email,
        full_name: body.name, // Map name to full_name
        role: body.role,
        status: body.status,
        metadata: body.features ? { features: body.features } : {},
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()

    if (error) throw error

    // Map back to expected format
    const updatedUser = {
      ...data[0],
      name: data[0].full_name,
      features: data[0].metadata?.features || body.features
    }

    return NextResponse.json({ user: updatedUser })
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

    // First delete from users table (this will cascade delete auth user)
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (dbError) throw dbError

    // Also delete from auth.users if it still exists
    try {
      await supabase.auth.admin.deleteUser(userId)
    } catch (authError) {
      // Ignore auth deletion errors as cascade might have already handled it
      console.log('Auth user already deleted or error:', authError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}