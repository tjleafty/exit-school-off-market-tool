import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Admin client with service role key for monitoring and administrative operations
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'User-Agent': 'ExitSchool-OffMarket-Tool/1.0 (Monitoring)',
      },
    },
  }
)

// Health check interfaces
interface DatabaseHealthCheck {
  healthy: boolean
  responseTime: number
  error?: string
  connectionCount?: number
  recentActivity?: number
}

interface EdgeFunctionHealth {
  name: string
  healthy: boolean
  responseTime: number
  error?: string
  lastExecution?: string
}

interface SystemHealth {
  timestamp: string
  overall: boolean
  database: DatabaseHealthCheck
  edgeFunctions: EdgeFunctionHealth[]
  metrics: {
    totalUsers: number
    activeUsers: number
    totalCompanies: number
    recentSearches: number
    emailsSentToday: number
  }
}

// Monitor database health
export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity with a simple query
    const { data: healthData, error: healthError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)
      .single()
    
    if (healthError) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: healthError.message,
      }
    }
    
    // Check recent activity (last hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { data: recentActivity } = await supabaseAdmin
      .from('audit_logs')
      .select('count')
      .gte('created_at', oneHourAgo)
      .single()
    
    // Get connection metrics if available
    const connectionMetrics = await getConnectionMetrics()
    
    return {
      healthy: true,
      responseTime: Date.now() - startTime,
      recentActivity: recentActivity?.count || 0,
      connectionCount: connectionMetrics?.connections,
    }
    
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Check Edge Functions health
export async function checkEdgeFunctionsHealth(): Promise<EdgeFunctionHealth[]> {
  const functions = [
    'send-invitation',
    'generate-report', 
    'enrich-company',
  ]
  
  const results: EdgeFunctionHealth[] = []
  
  for (const functionName of functions) {
    const startTime = Date.now()
    
    try {
      // Health check endpoint for each function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      
      const responseTime = Date.now() - startTime
      
      // Get last execution time from logs
      const { data: lastExecution } = await supabaseAdmin
        .from('edge_function_logs')
        .select('executed_at')
        .eq('function_name', functionName)
        .order('executed_at', { ascending: false })
        .limit(1)
        .single()
      
      results.push({
        name: functionName,
        healthy: response.ok,
        responseTime,
        lastExecution: lastExecution?.executed_at,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      })
      
    } catch (error) {
      results.push({
        name: functionName,
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

// Get system metrics
export async function getSystemMetrics() {
  try {
    const [
      totalUsersResult,
      activeUsersResult,
      totalCompaniesResult,
      recentSearchesResult,
      emailsTodayResult,
    ] = await Promise.all([
      // Total users
      supabaseAdmin
        .from('users')
        .select('count')
        .eq('status', 'ACTIVE')
        .single(),
      
      // Active users (last 7 days)
      supabaseAdmin
        .from('users')
        .select('count')
        .eq('status', 'ACTIVE')
        .gte('last_seen', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .single(),
      
      // Total companies
      supabaseAdmin
        .from('companies')
        .select('count')
        .single(),
      
      // Recent searches (last 24 hours)
      supabaseAdmin
        .from('searches')
        .select('count')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single(),
      
      // Emails sent today
      supabaseAdmin
        .from('email_logs')
        .select('count')
        .eq('status', 'SENT')
        .gte('sent_at', new Date().toISOString().split('T')[0])
        .single(),
    ])
    
    return {
      totalUsers: totalUsersResult.data?.count || 0,
      activeUsers: activeUsersResult.data?.count || 0,
      totalCompanies: totalCompaniesResult.data?.count || 0,
      recentSearches: recentSearchesResult.data?.count || 0,
      emailsSentToday: emailsTodayResult.data?.count || 0,
    }
    
  } catch (error) {
    console.error('Error getting system metrics:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalCompanies: 0,
      recentSearches: 0,
      emailsSentToday: 0,
    }
  }
}

// Get connection metrics (if available)
async function getConnectionMetrics() {
  try {
    // This would require a custom function or extension to get connection metrics
    // For now, we'll return null and implement later if needed
    return null
  } catch (error) {
    return null
  }
}

// Comprehensive system health check
export async function getSystemHealth(): Promise<SystemHealth> {
  const [databaseHealth, edgeFunctionsHealth, metrics] = await Promise.all([
    checkDatabaseHealth(),
    checkEdgeFunctionsHealth(),
    getSystemMetrics(),
  ])
  
  const overallHealthy = databaseHealth.healthy && 
                        edgeFunctionsHealth.every(func => func.healthy)
  
  return {
    timestamp: new Date().toISOString(),
    overall: overallHealthy,
    database: databaseHealth,
    edgeFunctions: edgeFunctionsHealth,
    metrics,
  }
}

// Monitor database performance
export async function getDatabasePerformanceMetrics() {
  try {
    const startTime = Date.now()
    
    // Test query performance with different operations
    const [
      simpleQueryTime,
      complexQueryTime,
      writeOperationTime,
    ] = await Promise.all([
      // Simple query
      measureQuery(() => 
        supabaseAdmin
          .from('users')
          .select('id')
          .limit(1)
          .single()
      ),
      
      // Complex query with joins
      measureQuery(() =>
        supabaseAdmin
          .from('companies')
          .select('*, users(name), searches(industry)')
          .limit(10)
      ),
      
      // Write operation (log entry)
      measureQuery(() =>
        supabaseAdmin
          .from('system_logs')
          .insert({
            level: 'INFO',
            message: 'Performance monitoring test',
            metadata: { test: true, timestamp: new Date().toISOString() }
          })
      ),
    ])
    
    return {
      simpleQueryTime,
      complexQueryTime,
      writeOperationTime,
      overallTime: Date.now() - startTime,
    }
    
  } catch (error) {
    return {
      simpleQueryTime: -1,
      complexQueryTime: -1,
      writeOperationTime: -1,
      overallTime: -1,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Helper function to measure query time
async function measureQuery(queryFn: () => Promise<any>): Promise<number> {
  const start = Date.now()
  try {
    await queryFn()
    return Date.now() - start
  } catch (error) {
    return -1 // Indicate error
  }
}

// Alert thresholds
export const ALERT_THRESHOLDS = {
  DATABASE_RESPONSE_TIME: 2000, // 2 seconds
  EDGE_FUNCTION_RESPONSE_TIME: 5000, // 5 seconds
  SIMPLE_QUERY_TIME: 500, // 500ms
  COMPLEX_QUERY_TIME: 2000, // 2 seconds
  WRITE_OPERATION_TIME: 1000, // 1 second
  MIN_RECENT_ACTIVITY: 1, // At least 1 activity in the last hour
}

// Check if alerts should be triggered
export async function checkAlerts(): Promise<Array<{
  type: 'warning' | 'error'
  message: string
  metric: string
  value: number
  threshold: number
}>> {
  const alerts = []
  const health = await getSystemHealth()
  const performance = await getDatabasePerformanceMetrics()
  
  // Database response time alert
  if (health.database.responseTime > ALERT_THRESHOLDS.DATABASE_RESPONSE_TIME) {
    alerts.push({
      type: 'warning' as const,
      message: 'Database response time is high',
      metric: 'database_response_time',
      value: health.database.responseTime,
      threshold: ALERT_THRESHOLDS.DATABASE_RESPONSE_TIME,
    })
  }
  
  // Database health alert
  if (!health.database.healthy) {
    alerts.push({
      type: 'error' as const,
      message: 'Database health check failed',
      metric: 'database_health',
      value: 0,
      threshold: 1,
    })
  }
  
  // Edge function alerts
  health.edgeFunctions.forEach(func => {
    if (!func.healthy) {
      alerts.push({
        type: 'error' as const,
        message: `Edge function ${func.name} is unhealthy`,
        metric: `edge_function_${func.name}`,
        value: 0,
        threshold: 1,
      })
    }
    
    if (func.responseTime > ALERT_THRESHOLDS.EDGE_FUNCTION_RESPONSE_TIME) {
      alerts.push({
        type: 'warning' as const,
        message: `Edge function ${func.name} response time is high`,
        metric: `edge_function_${func.name}_response_time`,
        value: func.responseTime,
        threshold: ALERT_THRESHOLDS.EDGE_FUNCTION_RESPONSE_TIME,
      })
    }
  })
  
  // Recent activity alert
  if (health.database.recentActivity !== undefined && 
      health.database.recentActivity < ALERT_THRESHOLDS.MIN_RECENT_ACTIVITY) {
    alerts.push({
      type: 'warning' as const,
      message: 'Low recent activity detected',
      metric: 'recent_activity',
      value: health.database.recentActivity,
      threshold: ALERT_THRESHOLDS.MIN_RECENT_ACTIVITY,
    })
  }
  
  return alerts
}