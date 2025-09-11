import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createHash } from 'crypto'

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

// POST - Admin manually reset a user's password
export async function POST(request) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Verify user exists and is not a SYSTEM user
    const { data: users, error: fetchError } = await supabase
      .from('app_users')
      .select('id, email, name, method')
      .eq('id', userId)
      .limit(1)

    if (fetchError) {
      console.error('Database error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = users[0]

    // Prevent resetting SYSTEM user password
    if (user.method === 'SYSTEM') {
      return NextResponse.json(
        { error: 'Cannot reset password for system user' },
        { status: 403 }
      )
    }

    const hashedPassword = hashPassword(newPassword)

    // Update password and set has_password to true
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        password_hash: hashedPassword,
        has_password: true,
        // Clear any existing reset tokens
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    console.log(`Admin reset password for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    })

  } catch (error) {
    console.error('Admin password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}