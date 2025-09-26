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

    // Check if user exists and is active
    const { data: users, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'ACTIVE')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      console.log('User not found or inactive:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const user = users[0]
    console.log('Found user:', { id: user.id, email: user.email, role: user.role })

    // For now, allow system admin with hardcoded password
    // TODO: Implement proper password storage
    if (user.method === 'SYSTEM' && password === 'password') {
      // Update last login
      await supabase
        .from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    }

    // For manual users, check if they have a password set
    if (user.method === 'MANUAL' && user.has_password) {
      if (!user.password_hash) {
        return NextResponse.json(
          { error: 'Password not set. Please contact administrator for password reset.' },
          { status: 401 }
        )
      }

      const hashedPassword = hashPassword(password)
      if (hashedPassword !== user.password_hash) {
        console.log('Manual user password mismatch for:', email)
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Password correct, update last login
      await supabase
        .from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    }

    // For manual users without password set
    if (user.method === 'MANUAL' && !user.has_password) {
      return NextResponse.json(
        { error: 'Password not set. Please contact administrator for password reset.' },
        { status: 401 }
      )
    }

    // For invited users
    if (user.method === 'INVITE' && user.status === 'INVITED') {
      return NextResponse.json(
        { error: 'Please check your email for the invitation link to set your password' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}