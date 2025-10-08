import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createHash } from 'crypto'

// Simple password hashing (in production, use bcrypt or similar)
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request) {
  try {
    console.log('POST /api/auth/login - Starting authentication')
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use Supabase Auth to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    })

    if (authError) {
      console.log('Auth error:', authError.message)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('Profile error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 500 }
      )
    }

    // Check if user is active
    if (userProfile.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact administrator.' },
        { status: 401 }
      )
    }

    // Update last seen
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', authData.user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.full_name,
        role: userProfile.role
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}