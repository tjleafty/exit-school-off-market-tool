import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createHash, randomBytes } from 'crypto'

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

// POST - Request password reset (send reset email)
export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .eq('status', 'ACTIVE')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      // Don't reveal if email exists or not
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    const user = users[0]

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save reset token to database
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        reset_token: resetToken,
        reset_token_expires: expiresAt.toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save reset token:', updateError)
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      )
    }

    // TODO: Send actual email with reset link
    // For now, just log the reset token (in production, send email)
    console.log(`Password reset requested for ${email}`)
    console.log(`Reset token: ${resetToken}`)
    console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`)

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
      // TODO: Remove this in production
      resetToken: resetToken
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// PUT - Actually reset the password with token
export async function PUT(request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, email, name, reset_token_expires')
      .eq('reset_token', token)
      .gt('reset_token_expires', new Date().toISOString())
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const user = users[0]
    const hashedPassword = hashPassword(newPassword)

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        password_hash: hashedPassword,
        has_password: true,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    console.log(`Password reset successful for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}