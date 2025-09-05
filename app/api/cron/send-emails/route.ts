import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Send emails cron job started')

    // Call send-emails edge function for all active campaigns
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        immediate: false // Follow campaign schedules
      })
    })

    if (!response.ok) {
      throw new Error(`Edge function error: ${await response.text()}`)
    }

    const result = await response.json()
    
    console.log('Send emails cron job completed:', result)

    return NextResponse.json({
      success: true,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
      message: result.message
    })

  } catch (error) {
    console.error('Send emails cron job error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'send-emails',
    timestamp: new Date().toISOString()
  })
}