import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getSystemHealth } from '@/lib/supabase-admin'
import { logger, LogCategory } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const metric = searchParams.get('metric') || 'all'
    
    // Calculate time range
    const hours = parseTimeRange(timeRange)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const dashboardData: any = {
      timestamp: new Date().toISOString(),
      timeRange: `${hours}h`,
      metrics: {},
    }
    
    // System health overview
    if (metric === 'all' || metric === 'health') {
      const health = await getSystemHealth()
      dashboardData.metrics.health = health
    }
    
    // Performance metrics
    if (metric === 'all' || metric === 'performance') {
      const performanceMetrics = await getPerformanceMetrics(since)
      dashboardData.metrics.performance = performanceMetrics
    }
    
    // Error metrics
    if (metric === 'all' || metric === 'errors') {
      const errorMetrics = await getErrorMetrics(since)
      dashboardData.metrics.errors = errorMetrics
    }
    
    // Usage metrics
    if (metric === 'all' || metric === 'usage') {
      const usageMetrics = await getUsageMetrics(since)
      dashboardData.metrics.usage = usageMetrics
    }
    
    // API metrics
    if (metric === 'all' || metric === 'api') {
      const apiMetrics = await getApiMetrics(since)
      dashboardData.metrics.api = apiMetrics
    }
    
    // Database metrics
    if (metric === 'all' || metric === 'database') {
      const databaseMetrics = await getDatabaseMetrics(since)
      dashboardData.metrics.database = databaseMetrics
    }
    
    // Security events
    if (metric === 'all' || metric === 'security') {
      const securityMetrics = await getSecurityMetrics(since)
      dashboardData.metrics.security = securityMetrics
    }
    
    dashboardData.responseTime = Date.now() - startTime
    
    // Log monitoring request
    await logger.info(LogCategory.API, 'Monitoring dashboard accessed', {
      metric,
      timeRange,
      responseTime: dashboardData.responseTime,
    })
    
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    await logger.error(LogCategory.API, 'Monitoring dashboard error', error as Error)
    
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}

// Utility functions for different metrics

async function getPerformanceMetrics(since: string) {
  try {
    // API response times from logs
    const { data: apiLogs } = await supabaseAdmin
      .from('system_logs')
      .select('duration, metadata, created_at')
      .eq('category', 'API')
      .gte('created_at', since)
      .not('duration', 'is', null)
    
    // Database query times
    const { data: dbLogs } = await supabaseAdmin
      .from('system_logs')
      .select('duration, metadata, created_at')
      .eq('category', 'DATABASE')
      .gte('created_at', since)
      .not('duration', 'is', null)
    
    return {
      api: {
        averageResponseTime: calculateAverage(apiLogs?.map(log => log.duration) || []),
        totalRequests: apiLogs?.length || 0,
        slowRequests: apiLogs?.filter(log => log.duration > 2000).length || 0,
      },
      database: {
        averageQueryTime: calculateAverage(dbLogs?.map(log => log.duration) || []),
        totalQueries: dbLogs?.length || 0,
        slowQueries: dbLogs?.filter(log => log.duration > 1000).length || 0,
      },
    }
  } catch (error) {
    console.error('Error getting performance metrics:', error)
    return null
  }
}

async function getErrorMetrics(since: string) {
  try {
    const { data: errorLogs } = await supabaseAdmin
      .from('error_logs')
      .select('severity, fingerprint, created_at, message')
      .gte('created_at', since)
    
    const { data: systemErrors } = await supabaseAdmin
      .from('system_logs')
      .select('level, category, created_at, message')
      .in('level', ['ERROR', 'FATAL'])
      .gte('created_at', since)
    
    // Group errors by severity
    const severityCount = {
      critical: errorLogs?.filter(log => log.severity === 'critical').length || 0,
      high: errorLogs?.filter(log => log.severity === 'high').length || 0,
      medium: errorLogs?.filter(log => log.severity === 'medium').length || 0,
      low: errorLogs?.filter(log => log.severity === 'low').length || 0,
    }
    
    // Top error types
    const errorFingerprints = new Map<string, { count: number; message: string }>()
    errorLogs?.forEach(error => {
      const existing = errorFingerprints.get(error.fingerprint)
      if (existing) {
        existing.count++
      } else {
        errorFingerprints.set(error.fingerprint, { count: 1, message: error.message })
      }
    })
    
    const topErrors = Array.from(errorFingerprints.entries())
      .map(([fingerprint, data]) => ({ fingerprint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      total: (errorLogs?.length || 0) + (systemErrors?.length || 0),
      severityBreakdown: severityCount,
      topErrors,
      errorRate: calculateErrorRate(errorLogs?.length || 0, since),
    }
  } catch (error) {
    console.error('Error getting error metrics:', error)
    return null
  }
}

async function getUsageMetrics(since: string) {
  try {
    // User activity
    const { data: activeUsers } = await supabaseAdmin
      .from('users')
      .select('count')
      .gte('last_seen', since)
      .single()
    
    // Company searches
    const { data: searches } = await supabaseAdmin
      .from('searches')
      .select('count, total_results')
      .gte('created_at', since)
    
    // Email activities
    const { data: emails } = await supabaseAdmin
      .from('email_logs')
      .select('count, status')
      .gte('sent_at', since)
    
    // Report generations
    const { data: reports } = await supabaseAdmin
      .from('reports')
      .select('count')
      .gte('created_at', since)
      .single()
    
    return {
      activeUsers: activeUsers?.count || 0,
      searches: {
        total: searches?.length || 0,
        totalResults: searches?.reduce((sum, search) => sum + (search.total_results || 0), 0) || 0,
      },
      emails: {
        total: emails?.length || 0,
        sent: emails?.filter(email => email.status === 'SENT').length || 0,
        failed: emails?.filter(email => email.status === 'FAILED').length || 0,
      },
      reports: reports?.count || 0,
    }
  } catch (error) {
    console.error('Error getting usage metrics:', error)
    return null
  }
}

async function getApiMetrics(since: string) {
  try {
    const { data: apiLogs } = await supabaseAdmin
      .from('system_logs')
      .select('metadata, duration, created_at')
      .eq('category', 'API')
      .gte('created_at', since)
    
    if (!apiLogs) return null
    
    // Parse API endpoints and status codes from metadata
    const endpointStats = new Map<string, { count: number; totalDuration: number; errors: number }>()
    const statusCodes = new Map<number, number>()
    
    apiLogs.forEach(log => {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        const endpoint = metadata?.endpoint || 'unknown'
        const statusCode = metadata?.statusCode || 200
        
        // Endpoint statistics
        const existing = endpointStats.get(endpoint)
        if (existing) {
          existing.count++
          existing.totalDuration += log.duration || 0
          if (statusCode >= 400) existing.errors++
        } else {
          endpointStats.set(endpoint, {
            count: 1,
            totalDuration: log.duration || 0,
            errors: statusCode >= 400 ? 1 : 0,
          })
        }
        
        // Status code distribution
        statusCodes.set(statusCode, (statusCodes.get(statusCode) || 0) + 1)
        
      } catch (parseError) {
        // Skip logs with invalid metadata
      }
    })
    
    // Top endpoints
    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: stats.count,
        avgResponseTime: stats.totalDuration / stats.count,
        errorRate: (stats.errors / stats.count) * 100,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)
    
    return {
      totalRequests: apiLogs.length,
      topEndpoints,
      statusCodeDistribution: Object.fromEntries(statusCodes),
      averageResponseTime: calculateAverage(apiLogs.map(log => log.duration || 0)),
    }
  } catch (error) {
    console.error('Error getting API metrics:', error)
    return null
  }
}

async function getDatabaseMetrics(since: string) {
  try {
    const { data: dbLogs } = await supabaseAdmin
      .from('system_logs')
      .select('metadata, duration, level, created_at')
      .eq('category', 'DATABASE')
      .gte('created_at', since)
    
    if (!dbLogs) return null
    
    const operations = new Map<string, { count: number; totalDuration: number; errors: number }>()
    const tables = new Map<string, number>()
    
    dbLogs.forEach(log => {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        const operation = metadata?.operation || 'unknown'
        const table = metadata?.table || 'unknown'
        
        // Operation statistics
        const existing = operations.get(operation)
        if (existing) {
          existing.count++
          existing.totalDuration += log.duration || 0
          if (log.level === 'ERROR') existing.errors++
        } else {
          operations.set(operation, {
            count: 1,
            totalDuration: log.duration || 0,
            errors: log.level === 'ERROR' ? 1 : 0,
          })
        }
        
        // Table access frequency
        tables.set(table, (tables.get(table) || 0) + 1)
        
      } catch (parseError) {
        // Skip logs with invalid metadata
      }
    })
    
    return {
      totalOperations: dbLogs.length,
      operationBreakdown: Object.fromEntries(operations),
      tableAccess: Object.fromEntries(
        Array.from(tables.entries()).sort(([,a], [,b]) => b - a).slice(0, 10)
      ),
      averageQueryTime: calculateAverage(dbLogs.map(log => log.duration || 0)),
      errorRate: (dbLogs.filter(log => log.level === 'ERROR').length / dbLogs.length) * 100,
    }
  } catch (error) {
    console.error('Error getting database metrics:', error)
    return null
  }
}

async function getSecurityMetrics(since: string) {
  try {
    const { data: securityLogs } = await supabaseAdmin
      .from('system_logs')
      .select('metadata, level, created_at, message')
      .eq('category', 'SECURITY')
      .gte('created_at', since)
    
    if (!securityLogs) return { events: 0, severityBreakdown: {}, topEvents: [] }
    
    const severityCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    
    const eventTypes = new Map<string, number>()
    
    securityLogs.forEach(log => {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        const severity = metadata?.severity?.toLowerCase() || 'low'
        
        if (severityCount.hasOwnProperty(severity)) {
          (severityCount as any)[severity]++
        }
        
        // Extract event type from message
        const eventType = log.message.replace('Security Event: ', '').split(' ')[0]
        eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1)
        
      } catch (parseError) {
        // Skip logs with invalid metadata
      }
    })
    
    const topEvents = Array.from(eventTypes.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      events: securityLogs.length,
      severityBreakdown: severityCount,
      topEvents,
    }
  } catch (error) {
    console.error('Error getting security metrics:', error)
    return null
  }
}

// Utility functions

function parseTimeRange(timeRange: string): number {
  const unit = timeRange.slice(-1)
  const value = parseInt(timeRange.slice(0, -1))
  
  switch (unit) {
    case 'h': return value
    case 'd': return value * 24
    case 'w': return value * 24 * 7
    default: return 24 // Default to 24 hours
  }
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
}

function calculateErrorRate(errorCount: number, since: string): number {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60)))
  return errorCount / hours // Errors per hour
}