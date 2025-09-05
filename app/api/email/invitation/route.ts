import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { sendInvitationEmail } from '@/lib/email'

interface InvitationEmailRequest {
  email: string
  name?: string
  token: string
  expiresAt: string
  companyName?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Verify authentication (service key or user auth)
    const authHeader = request.headers.get('Authorization')
    let isServiceRequest = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        isServiceRequest = true
      }
    }

    if (!isServiceRequest) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { 
      email, 
      name, 
      token, 
      expiresAt, 
      companyName 
    }: InvitationEmailRequest = await request.json()

    if (!email || !token || !expiresAt) {
      return NextResponse.json(
        { error: 'Missing required fields: email, token, expiresAt' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate expiration date
    if (new Date(expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Invitation has already expired' },
        { status: 400 }
      )
    }

    // Send the email
    const result = await sendInvitationEmail({
      email,
      name,
      token,
      companyName,
      expiresAt
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: result.id,
      message: 'Invitation email sent successfully'
    })

  } catch (error) {
    console.error('Invitation email API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}