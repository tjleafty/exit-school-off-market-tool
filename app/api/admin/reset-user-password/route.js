import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '../../../../lib/supabase'

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

    // Verify user exists
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, metadata')
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
    if (user.metadata?.method === 'SYSTEM') {
      return NextResponse.json(
        { error: 'Cannot reset password for system user' },
        { status: 403 }
      )
    }

    // Update password using Supabase Auth admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

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