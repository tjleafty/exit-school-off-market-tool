import { NextRequest, NextResponse } from 'next/server'
import { getSystemHealth, checkAlerts, getDatabasePerformanceMetrics } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const includeMetrics = searchParams.get('metrics') === 'true'
    const includeAlerts = searchParams.get('alerts') === 'true'
    const includePerformance = searchParams.get('performance') === 'true'
    
    const health = await getSystemHealth()
    
    const response: any = {
      status: health.overall ? 'healthy' : 'unhealthy',
      timestamp: health.timestamp,
      uptime: process.uptime(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      environment: process.env.NODE_ENV,
      database: {
        healthy: health.database.healthy,
        responseTime: health.database.responseTime,
        ...(health.database.error && { error: health.database.error }),
        ...(health.database.recentActivity !== undefined && { recentActivity: health.database.recentActivity }),
      },
      edgeFunctions: health.edgeFunctions.map(func => ({
        name: func.name,
        healthy: func.healthy,
        responseTime: func.responseTime,
        ...(func.error && { error: func.error }),
        ...(func.lastExecution && { lastExecution: func.lastExecution }),
      })),
    }
    
    if (includeMetrics) {
      response.metrics = health.metrics
    }
    
    if (includePerformance) {
      const performanceMetrics = await getDatabasePerformanceMetrics()
      response.performance = performanceMetrics
    }
    
    if (includeAlerts) {
      const alerts = await checkAlerts()
      response.alerts = alerts
    }
    
    response.responseTime = Date.now() - startTime
    
    const statusCode = health.overall ? 200 : 503
    
    return new NextResponse(JSON.stringify(response, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': health.overall ? 'healthy' : 'unhealthy',
        'X-Response-Time': `${response.responseTime}ms`,
      },
    })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    }
    
    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Status': 'error',
      },
    })
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const health = await getSystemHealth()
    
    return new NextResponse(null, {
      status: health.overall ? 200 : 503,
      headers: {
        'X-Health-Status': health.overall ? 'healthy' : 'unhealthy',
        'X-Database-Status': health.database.healthy ? 'healthy' : 'unhealthy',
        'X-Database-Response-Time': `${health.database.responseTime}ms`,
      },
    })
    
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-Health-Status': 'error',
      },
    })
  }
}