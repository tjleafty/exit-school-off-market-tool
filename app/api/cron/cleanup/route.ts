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

    console.log('Daily cleanup cron job started')

    let cleanupSummary = {
      oldEmailLogs: 0,
      oldAuditLogs: 0,
      orphanedEnrichments: 0,
      expiredSessions: 0,
      failedEnrichments: 0
    }

    // 1. Clean up old email logs (older than 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { count: emailLogsDeleted } = await supabase
      .from('email_logs')
      .delete()
      .lt('sent_at', ninetyDaysAgo.toISOString())

    cleanupSummary.oldEmailLogs = emailLogsDeleted || 0

    // 2. Clean up old audit logs (older than 180 days)
    const oneEightyDaysAgo = new Date()
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180)
    
    const { count: auditLogsDeleted } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', oneEightyDaysAgo.toISOString())

    cleanupSummary.oldAuditLogs = auditLogsDeleted || 0

    // 3. Clean up failed enrichments (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { count: failedEnrichmentsDeleted } = await supabase
      .from('enrichments')
      .delete()
      .eq('status', 'FAILED')
      .lt('created_at', sevenDaysAgo.toISOString())

    cleanupSummary.failedEnrichments = failedEnrichmentsDeleted || 0

    // 4. Clean up orphaned enrichments (no associated company)
    const { data: orphanedEnrichments } = await supabase
      .from('enrichments')
      .select('id')
      .not('company_id', 'in', 
        supabase.from('companies').select('id')
      )

    if (orphanedEnrichments && orphanedEnrichments.length > 0) {
      const orphanedIds = orphanedEnrichments.map(e => e.id)
      const { count: orphanedDeleted } = await supabase
        .from('enrichments')
        .delete()
        .in('id', orphanedIds)
      
      cleanupSummary.orphanedEnrichments = orphanedDeleted || 0
    }

    // 5. Clean up expired user sessions (if using custom session management)
    // This would depend on your session implementation
    // const expiredSessionsCount = await cleanupExpiredSessions()
    // cleanupSummary.expiredSessions = expiredSessionsCount

    // 6. Update company statistics (optional maintenance)
    await supabase.rpc('update_company_statistics')

    // 7. Vacuum analyze important tables (PostgreSQL maintenance)
    // Note: This might not be available in Supabase hosted environment
    // await supabase.rpc('vacuum_analyze_tables')

    console.log('Daily cleanup completed:', cleanupSummary)

    return NextResponse.json({
      success: true,
      cleanupSummary,
      message: 'Daily cleanup completed successfully'
    })

  } catch (error) {
    console.error('Daily cleanup cron job error:', error)
    
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
    service: 'cleanup',
    timestamp: new Date().toISOString()
  })
}