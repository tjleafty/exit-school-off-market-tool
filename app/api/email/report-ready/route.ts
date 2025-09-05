import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { sendReportReadyEmail } from '@/lib/email'

interface ReportReadyRequest {
  reportId: string
  companyName: string
  tier: 'ENHANCED' | 'BI'
  userId: string
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

    const { reportId, companyName, tier, userId }: ReportReadyRequest = await request.json()

    if (!reportId || !companyName || !tier || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: reportId, companyName, tier, userId' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get report details to get generation timestamp
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('generated_at')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Send the email
    const result = await sendReportReadyEmail({
      email: user.email,
      userName: user.name || undefined,
      companyName,
      reportId,
      reportTier: tier,
      generatedAt: report.generated_at
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
      message: 'Report ready email sent successfully'
    })

  } catch (error) {
    console.error('Report ready email API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}