import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  userAgent: string
  url: string
  userId?: string
  sessionId?: string
  buildId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  tags?: Record<string, string>
  context?: Record<string, any>
  fingerprint?: string
}

export async function POST(request: NextRequest) {
  try {
    const errorData: ErrorReport = await request.json()
    
    // Validate required fields
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: message, timestamp' },
        { status: 400 }
      )
    }
    
    // Extract additional context from headers
    const headersList = headers()
    const userAgent = headersList.get('user-agent') || errorData.userAgent || 'unknown'
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const referer = headersList.get('referer') || errorData.url || 'unknown'
    
    // Determine severity based on error content
    const severity = determineSeverity(errorData.message, errorData.stack)
    
    // Generate fingerprint for error deduplication
    const fingerprint = generateErrorFingerprint(errorData.message, errorData.stack)
    
    // Prepare error record for database
    const errorRecord = {
      message: errorData.message.substring(0, 1000), // Limit message length
      stack: errorData.stack?.substring(0, 5000), // Limit stack trace length
      component_stack: errorData.componentStack?.substring(0, 2000),
      timestamp: errorData.timestamp,
      user_agent: userAgent,
      ip_address: ip,
      url: referer,
      user_id: errorData.userId,
      session_id: errorData.sessionId,
      build_id: process.env.VERCEL_GIT_COMMIT_SHA || errorData.buildId,
      severity,
      tags: errorData.tags ? JSON.stringify(errorData.tags) : null,
      context: errorData.context ? JSON.stringify(errorData.context) : null,
      fingerprint,
      environment: process.env.NODE_ENV,
      created_at: new Date().toISOString(),
    }
    
    // Store error in database
    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .insert([errorRecord])
      .select()
      .single()
    
    if (error) {
      console.error('Failed to store error in database:', error)
      
      // Fallback: log to console in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Error Report:', JSON.stringify(errorRecord, null, 2))
      }
      
      return NextResponse.json(
        { error: 'Failed to store error report' },
        { status: 500 }
      )
    }
    
    // Send alert for critical errors
    if (severity === 'critical' || severity === 'high') {
      await sendErrorAlert(errorRecord, data.id)
    }
    
    // Track error metrics
    await trackErrorMetrics(severity, fingerprint)
    
    return NextResponse.json(
      { 
        success: true, 
        id: data.id,
        fingerprint,
        severity 
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Error in error reporting endpoint:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get error statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const severity = searchParams.get('severity')
    const fingerprint = searchParams.get('fingerprint')
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    let query = supabaseAdmin
      .from('error_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    if (fingerprint) {
      query = query.eq('fingerprint', fingerprint)
    }
    
    const { data: errors, error } = await query
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch error logs' },
        { status: 500 }
      )
    }
    
    // Aggregate error statistics
    const stats = {
      total: errors.length,
      severityBreakdown: {
        critical: errors.filter(e => e.severity === 'critical').length,
        high: errors.filter(e => e.severity === 'high').length,
        medium: errors.filter(e => e.severity === 'medium').length,
        low: errors.filter(e => e.severity === 'low').length,
      },
      topErrors: getTopErrors(errors),
      recentErrors: errors.slice(0, 10),
      timeRange: {
        from: since,
        to: new Date().toISOString(),
        hours,
      }
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error fetching error statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error statistics' },
      { status: 500 }
    )
  }
}

// Utility functions
function determineSeverity(message: string, stack?: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalPatterns = [
    'database connection',
    'payment failed',
    'authentication failure',
    'security violation',
    'data corruption',
  ]
  
  const highPatterns = [
    'api timeout',
    'server error',
    'network failure',
    'uncaught exception',
    'memory leak',
  ]
  
  const mediumPatterns = [
    'validation error',
    'not found',
    'permission denied',
    'rate limit',
  ]
  
  const lowerMessage = message.toLowerCase()
  const lowerStack = stack?.toLowerCase() || ''
  
  if (criticalPatterns.some(pattern => 
    lowerMessage.includes(pattern) || lowerStack.includes(pattern)
  )) {
    return 'critical'
  }
  
  if (highPatterns.some(pattern => 
    lowerMessage.includes(pattern) || lowerStack.includes(pattern)
  )) {
    return 'high'
  }
  
  if (mediumPatterns.some(pattern => 
    lowerMessage.includes(pattern) || lowerStack.includes(pattern)
  )) {
    return 'medium'
  }
  
  return 'low'
}

function generateErrorFingerprint(message: string, stack?: string): string {
  // Create a consistent fingerprint for error deduplication
  const content = `${message}${stack || ''}`
    .replace(/\d+/g, 'N') // Replace numbers with N
    .replace(/\/[a-f0-9-]{36}/g, '/UUID') // Replace UUIDs
    .replace(/\/\w{6,}/g, '/ID') // Replace long IDs
    .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16)
}

function getTopErrors(errors: any[]): Array<{ fingerprint: string; count: number; message: string; severity: string }> {
  const errorCounts = new Map<string, { count: number; message: string; severity: string }>()
  
  errors.forEach(error => {
    const existing = errorCounts.get(error.fingerprint)
    if (existing) {
      existing.count++
    } else {
      errorCounts.set(error.fingerprint, {
        count: 1,
        message: error.message,
        severity: error.severity,
      })
    }
  })
  
  return Array.from(errorCounts.entries())
    .map(([fingerprint, data]) => ({ fingerprint, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function sendErrorAlert(errorRecord: any, errorId: string) {
  try {
    // In a real implementation, this would send notifications via:
    // - Email to development team
    // - Slack/Discord webhook
    // - PagerDuty for critical errors
    // - Custom alerting system
    
    console.error(`=¨ ${errorRecord.severity.toUpperCase()} ERROR ALERT:`, {
      id: errorId,
      message: errorRecord.message,
      url: errorRecord.url,
      timestamp: errorRecord.timestamp,
      environment: errorRecord.environment,
    })
    
    // Example webhook notification (commented out)
    /*
    if (process.env.ALERT_WEBHOOK_URL) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `=¨ ${errorRecord.severity.toUpperCase()} Error: ${errorRecord.message}`,
          attachments: [{
            color: errorRecord.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Environment', value: errorRecord.environment, short: true },
              { title: 'URL', value: errorRecord.url, short: true },
              { title: 'User Agent', value: errorRecord.user_agent, short: false },
            ],
          }],
        }),
      })
    }
    */
    
  } catch (alertError) {
    console.error('Failed to send error alert:', alertError)
  }
}

async function trackErrorMetrics(severity: string, fingerprint: string) {
  try {
    // Track error metrics for monitoring dashboard
    // This could be sent to analytics service, time-series database, etc.
    
    const metrics = {
      timestamp: new Date().toISOString(),
      metric: 'error_occurred',
      severity,
      fingerprint,
      environment: process.env.NODE_ENV,
    }
    
    // Example: Send to analytics service
    // await sendToAnalytics(metrics)
    
  } catch (metricsError) {
    console.error('Failed to track error metrics:', metricsError)
  }
}