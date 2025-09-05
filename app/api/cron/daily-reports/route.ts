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

    console.log('Daily reports cron job started')

    // Get yesterday's date for reporting
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

    // Gather daily statistics
    const [
      { count: newCompanies },
      { count: enrichmentsCompleted },
      { count: emailsSent },
      { count: reportsGenerated }
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      
      supabase
        .from('enrichments')
        .select('*', { count: 'exact' })
        .eq('status', 'COMPLETED')
        .gte('enriched_at', startOfDay)
        .lte('enriched_at', endOfDay),
      
      supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .eq('status', 'SENT')
        .gte('sent_at', startOfDay)
        .lte('sent_at', endOfDay),
      
      supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .gte('generated_at', startOfDay)
        .lte('generated_at', endOfDay)
    ])

    // Get active users count
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('status', 'ACTIVE')

    // Create daily summary report
    const dailySummary = {
      date: yesterday.toISOString().split('T')[0],
      statistics: {
        newCompanies: newCompanies || 0,
        enrichmentsCompleted: enrichmentsCompleted || 0,
        emailsSent: emailsSent || 0,
        reportsGenerated: reportsGenerated || 0,
        activeUsers: activeUsers || 0
      },
      generatedAt: new Date().toISOString()
    }

    // Save daily report
    const { error: saveError } = await supabase
      .from('daily_reports')
      .insert({
        report_date: yesterday.toISOString().split('T')[0],
        statistics: dailySummary.statistics,
        summary: `Daily summary for ${yesterday.toDateString()}: ${newCompanies} new companies, ${enrichmentsCompleted} enrichments, ${emailsSent} emails sent, ${reportsGenerated} reports generated.`
      })

    if (saveError) {
      console.error('Error saving daily report:', saveError)
    }

    // Send summary email to admin (optional - implement based on requirements)
    // await sendDailySummaryEmail(dailySummary)

    console.log('Daily reports cron job completed:', dailySummary)

    return NextResponse.json({
      success: true,
      dailySummary,
      message: 'Daily report generated successfully'
    })

  } catch (error) {
    console.error('Daily reports cron job error:', error)
    
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
    service: 'daily-reports',
    timestamp: new Date().toISOString()
  })
}