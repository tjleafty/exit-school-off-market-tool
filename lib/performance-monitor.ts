import { NextRequest, NextResponse } from 'next/server'
import { logger, LogCategory } from './logger'

// Performance monitoring configuration
interface PerformanceConfig {
  enabled: boolean
  sampleRate: number // 0-1, percentage of requests to monitor
  slowRequestThreshold: number // milliseconds
  trackHeaders: boolean
  trackUserAgent: boolean
  excludePaths: string[]
}

const defaultConfig: PerformanceConfig = {
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE || '0.1'), // 10% by default
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000'), // 2 seconds
  trackHeaders: process.env.TRACK_REQUEST_HEADERS === 'true',
  trackUserAgent: true,
  excludePaths: ['/api/health', '/api/monitoring', '/_next', '/favicon.ico', '/robots.txt'],
}

interface RequestTiming {
  startTime: number
  endTime?: number
  duration?: number
  phases: {
    middleware?: number
    handler?: number
    response?: number
  }
}

interface PerformanceMetrics {
  method: string
  pathname: string
  statusCode: number
  duration: number
  userAgent?: string
  ip?: string
  referer?: string
  contentLength?: number
  cacheStatus?: string
  dbQueries?: number
  dbQueryTime?: number
  externalApiCalls?: number
  externalApiTime?: number
  memoryUsage?: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpuUsage?: NodeJS.CpuUsage
}

class PerformanceMonitor {
  private config: PerformanceConfig
  private activeRequests = new Map<string, RequestTiming>()

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  // Check if request should be monitored
  private shouldMonitor(pathname: string): boolean {
    if (!this.config.enabled) return false
    
    // Check if path is excluded
    if (this.config.excludePaths.some(path => pathname.startsWith(path))) {
      return false
    }
    
    // Apply sample rate
    return Math.random() < this.config.sampleRate
  }

  // Start monitoring a request
  startMonitoring(request: NextRequest): string | null {
    const pathname = new URL(request.url).pathname
    
    if (!this.shouldMonitor(pathname)) {
      return null
    }
    
    const requestId = this.generateRequestId()
    const timing: RequestTiming = {
      startTime: performance.now(),
      phases: {},
    }
    
    this.activeRequests.set(requestId, timing)
    return requestId
  }

  // Record phase timing
  recordPhase(requestId: string, phase: keyof RequestTiming['phases'], duration: number): void {
    const timing = this.activeRequests.get(requestId)
    if (timing) {
      timing.phases[phase] = duration
    }
  }

  // End monitoring and collect metrics
  async endMonitoring(
    requestId: string,
    request: NextRequest,
    response: NextResponse
  ): Promise<void> {
    const timing = this.activeRequests.get(requestId)
    if (!timing) return

    timing.endTime = performance.now()
    timing.duration = timing.endTime - timing.startTime

    this.activeRequests.delete(requestId)

    const metrics = await this.collectMetrics(request, response, timing)
    await this.recordMetrics(metrics)

    // Log slow requests
    if (timing.duration > this.config.slowRequestThreshold) {
      await logger.warn(LogCategory.PERFORMANCE, `Slow request detected: ${metrics.method} ${metrics.pathname}`, {
        duration: timing.duration,
        pathname: metrics.pathname,
        statusCode: metrics.statusCode,
      })
    }
  }

  // Collect comprehensive metrics
  private async collectMetrics(
    request: NextRequest,
    response: NextResponse,
    timing: RequestTiming
  ): Promise<PerformanceMetrics> {
    const url = new URL(request.url)
    
    const metrics: PerformanceMetrics = {
      method: request.method,
      pathname: url.pathname,
      statusCode: response.status,
      duration: timing.duration!,
    }

    // Request headers and metadata
    if (this.config.trackUserAgent) {
      metrics.userAgent = request.headers.get('user-agent') || undefined
    }

    if (this.config.trackHeaders) {
      metrics.ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || undefined
      metrics.referer = request.headers.get('referer') || undefined
    }

    // Response metadata
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      metrics.contentLength = parseInt(contentLength)
    }

    metrics.cacheStatus = response.headers.get('x-cache') || 
                         response.headers.get('cf-cache-status') || undefined

    // System resource usage
    if (process.memoryUsage) {
      metrics.memoryUsage = process.memoryUsage()
    }

    if (process.cpuUsage) {
      metrics.cpuUsage = process.cpuUsage()
    }

    return metrics
  }

  // Record metrics to logging system
  private async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    await logger.performance(
      LogCategory.API,
      `${metrics.method} ${metrics.pathname}`,
      metrics.duration,
      {
        method: metrics.method,
        pathname: metrics.pathname,
        statusCode: metrics.statusCode,
        userAgent: metrics.userAgent,
        ip: metrics.ip,
        contentLength: metrics.contentLength,
        memoryUsage: metrics.memoryUsage,
        performanceMonitoring: true,
      }
    )

    // Send to external monitoring service if configured
    await this.sendToMonitoringService(metrics)
  }

  // Send metrics to external monitoring service
  private async sendToMonitoringService(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Example: Send to custom monitoring endpoint
      if (process.env.MONITORING_ENDPOINT) {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'exit-school-off-market-tool',
            environment: process.env.NODE_ENV,
            ...metrics,
          }),
        })
      }

      // Example: Send to DataDog, New Relic, or other APM tools
      // await this.sendToDataDog(metrics)
      // await this.sendToNewRelic(metrics)
      
    } catch (error) {
      console.error('Failed to send metrics to monitoring service:', error)
    }
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get current performance stats
  getStats(): {
    activeRequests: number
    config: PerformanceConfig
  } {
    return {
      activeRequests: this.activeRequests.size,
      config: this.config,
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Middleware function for Next.js
export function withPerformanceMonitoring(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = performanceMonitor.startMonitoring(request)
    
    const handlerStartTime = performance.now()
    
    try {
      const response = await handler(request)
      
      if (requestId) {
        const handlerDuration = performance.now() - handlerStartTime
        performanceMonitor.recordPhase(requestId, 'handler', handlerDuration)
        
        // End monitoring asynchronously to avoid blocking response
        setImmediate(() => {
          performanceMonitor.endMonitoring(requestId, request, response)
        })
      }
      
      return response
      
    } catch (error) {
      if (requestId) {
        const handlerDuration = performance.now() - handlerStartTime
        performanceMonitor.recordPhase(requestId, 'handler', handlerDuration)
        
        // Create error response for monitoring
        const errorResponse = NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        )
        
        setImmediate(() => {
          performanceMonitor.endMonitoring(requestId, request, errorResponse)
        })
      }
      
      throw error
    }
  }
}

// Database query monitoring helper
export class DatabaseMonitor {
  private static queryCount = 0
  private static totalQueryTime = 0

  static startQuery(): () => void {
    const startTime = performance.now()
    this.queryCount++

    return () => {
      const duration = performance.now() - startTime
      this.totalQueryTime += duration
      
      // Log slow queries
      if (duration > 1000) { // 1 second threshold
        logger.warn(LogCategory.DATABASE, `Slow database query detected`, {
          duration,
          queryNumber: this.queryCount,
        })
      }
    }
  }

  static getStats(): { queryCount: number; totalQueryTime: number; averageQueryTime: number } {
    return {
      queryCount: this.queryCount,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
    }
  }

  static reset(): void {
    this.queryCount = 0
    this.totalQueryTime = 0
  }
}

// External API monitoring helper
export class ExternalApiMonitor {
  private static callCount = 0
  private static totalCallTime = 0
  private static failureCount = 0

  static async monitorCall<T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    this.callCount++

    try {
      const result = await apiCall()
      const duration = performance.now() - startTime
      this.totalCallTime += duration

      // Log slow API calls
      if (duration > 5000) { // 5 second threshold
        await logger.warn(LogCategory.EXTERNAL_API, `Slow external API call: ${apiName}`, {
          duration,
          apiName,
        })
      }

      await logger.debug(LogCategory.EXTERNAL_API, `External API call: ${apiName}`, {
        duration,
        apiName,
        success: true,
      })

      return result

    } catch (error) {
      this.failureCount++
      const duration = performance.now() - startTime

      await logger.error(LogCategory.EXTERNAL_API, `External API call failed: ${apiName}`, error as Error, {
        duration,
        apiName,
      })

      throw error
    }
  }

  static getStats(): {
    callCount: number
    totalCallTime: number
    averageCallTime: number
    failureCount: number
    successRate: number
  } {
    const successRate = this.callCount > 0 ? 
      ((this.callCount - this.failureCount) / this.callCount) * 100 : 100

    return {
      callCount: this.callCount,
      totalCallTime: this.totalCallTime,
      averageCallTime: this.callCount > 0 ? this.totalCallTime / this.callCount : 0,
      failureCount: this.failureCount,
      successRate,
    }
  }

  static reset(): void {
    this.callCount = 0
    this.totalCallTime = 0
    this.failureCount = 0
  }
}

// Memory monitoring helper
export class MemoryMonitor {
  private static thresholds = {
    warning: 500 * 1024 * 1024, // 500MB
    critical: 1000 * 1024 * 1024, // 1GB
  }

  static async checkMemoryUsage(): Promise<void> {
    if (typeof process === 'undefined') return

    const usage = process.memoryUsage()
    const heapUsedMB = usage.heapUsed / 1024 / 1024
    const rssMB = usage.rss / 1024 / 1024

    if (usage.heapUsed > this.thresholds.critical || usage.rss > this.thresholds.critical) {
      await logger.error(LogCategory.PERFORMANCE, 'Critical memory usage detected', undefined, {
        heapUsedMB: Math.round(heapUsedMB),
        rssMB: Math.round(rssMB),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      })
    } else if (usage.heapUsed > this.thresholds.warning || usage.rss > this.thresholds.warning) {
      await logger.warn(LogCategory.PERFORMANCE, 'High memory usage detected', {
        heapUsedMB: Math.round(heapUsedMB),
        rssMB: Math.round(rssMB),
      })
    }
  }

  static setThresholds(warning: number, critical: number): void {
    this.thresholds = { warning, critical }
  }
}

// Periodic memory monitoring
if (typeof process !== 'undefined') {
  setInterval(() => {
    MemoryMonitor.checkMemoryUsage()
  }, 60000) // Check every minute
}

export { PerformanceMonitor }