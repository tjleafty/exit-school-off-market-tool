import { supabaseAdmin } from './supabase-admin'

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Log categories for better organization
export enum LogCategory {
  APPLICATION = 'APPLICATION',
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  API = 'API',
  EMAIL = 'EMAIL',
  SEARCH = 'SEARCH',
  ENRICHMENT = 'ENRICHMENT',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  EXTERNAL_API = 'EXTERNAL_API',
  CRON_JOB = 'CRON_JOB',
}

export interface LogEntry {
  level: keyof typeof LogLevel
  category: LogCategory
  message: string
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
  timestamp?: string
  error?: Error
  duration?: number
  tags?: string[]
}

export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  component?: string
}

class Logger {
  private context: LogContext = {}
  private minLogLevel: LogLevel
  private enableConsole: boolean
  private enableDatabase: boolean
  private bufferSize: number
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    this.minLogLevel = this.getLogLevelFromEnv()
    this.enableConsole = process.env.ENABLE_CONSOLE_LOGGING !== 'false'
    this.enableDatabase = process.env.ENABLE_DATABASE_LOGGING !== 'false'
    this.bufferSize = parseInt(process.env.LOG_BUFFER_SIZE || '100')
    
    // Auto-flush buffer every 30 seconds
    if (this.enableDatabase) {
      this.flushInterval = setInterval(() => {
        this.flushBuffer()
      }, 30000)
    }
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    return LogLevel[envLevel as keyof typeof LogLevel] ?? 
           (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG)
  }

  // Set global context that will be included in all logs
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context }
  }

  // Clear context
  clearContext(): void {
    this.context = {}
  }

  // Main logging method
  private async log(entry: LogEntry): Promise<void> {
    const logLevel = LogLevel[entry.level]
    
    // Skip if below minimum log level
    if (logLevel < this.minLogLevel) {
      return
    }

    // Add context and timestamp
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      ...this.context,
      metadata: {
        ...entry.metadata,
        environment: process.env.NODE_ENV,
        buildId: process.env.VERCEL_GIT_COMMIT_SHA,
      },
    }

    // Console logging
    if (this.enableConsole) {
      this.logToConsole(fullEntry)
    }

    // Database logging (buffered)
    if (this.enableDatabase) {
      await this.logToDatabase(fullEntry)
    }

    // Real-time alerts for critical errors
    if (logLevel >= LogLevel.ERROR) {
      await this.sendAlert(fullEntry)
    }
  }

  // Convenience methods for different log levels
  debug(category: LogCategory, message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log({ level: 'DEBUG', category, message, metadata })
  }

  info(category: LogCategory, message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log({ level: 'INFO', category, message, metadata })
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log({ level: 'WARN', category, message, metadata })
  }

  error(category: LogCategory, message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
    return this.log({ 
      level: 'ERROR', 
      category, 
      message, 
      error,
      metadata: {
        ...metadata,
        stack: error?.stack,
        errorName: error?.name,
      }
    })
  }

  fatal(category: LogCategory, message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
    return this.log({ 
      level: 'FATAL', 
      category, 
      message, 
      error,
      metadata: {
        ...metadata,
        stack: error?.stack,
        errorName: error?.name,
      }
    })
  }

  // Performance logging
  async performance(
    category: LogCategory, 
    operation: string, 
    duration: number, 
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.log({
      level: 'INFO',
      category,
      message: `Performance: ${operation}`,
      duration,
      metadata: {
        ...metadata,
        operation,
        performanceLog: true,
      },
      tags: ['performance'],
    })
  }

  // Security event logging
  async security(
    message: string, 
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = severity === 'CRITICAL' || severity === 'HIGH' ? 'ERROR' : 
                  severity === 'MEDIUM' ? 'WARN' : 'INFO'
    
    return this.log({
      level: level as keyof typeof LogLevel,
      category: LogCategory.SECURITY,
      message: `Security Event: ${message}`,
      metadata: {
        ...metadata,
        severity,
        securityEvent: true,
      },
      tags: ['security', severity.toLowerCase()],
    })
  }

  // API request/response logging
  async api(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = statusCode >= 500 ? 'ERROR' :
                  statusCode >= 400 ? 'WARN' : 'INFO'

    return this.log({
      level: level as keyof typeof LogLevel,
      category: LogCategory.API,
      message: `${method} ${endpoint} - ${statusCode}`,
      duration,
      metadata: {
        ...metadata,
        method,
        endpoint,
        statusCode,
        apiLog: true,
      },
      tags: ['api'],
    })
  }

  // Database operation logging
  async database(
    operation: string,
    table: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ): Promise<void> {
    const level = error ? 'ERROR' : 'DEBUG'

    return this.log({
      level: level as keyof typeof LogLevel,
      category: LogCategory.DATABASE,
      message: `DB ${operation} on ${table}${error ? ' failed' : ''}`,
      duration,
      error,
      metadata: {
        operation,
        table,
        rowsAffected,
        databaseLog: true,
      },
      tags: ['database'],
    })
  }

  // Console logging with colors
  private logToConsole(entry: LogEntry): void {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m', // Magenta
      RESET: '\x1b[0m',
    }

    const color = colors[entry.level] || colors.INFO
    const timestamp = entry.timestamp?.substring(11, 23) || new Date().toISOString().substring(11, 23)
    
    let logMessage = `${color}[${entry.level}]${colors.RESET} ${timestamp} [${entry.category}]`
    
    if (entry.userId) logMessage += ` [User:${entry.userId}]`
    if (entry.requestId) logMessage += ` [Req:${entry.requestId.substring(0, 8)}]`
    if (entry.duration !== undefined) logMessage += ` [${entry.duration}ms]`
    
    logMessage += ` ${entry.message}`

    console.log(logMessage)

    // Log metadata if present and in development
    if (entry.metadata && Object.keys(entry.metadata).length > 0 && process.env.NODE_ENV === 'development') {
      console.log('  Metadata:', entry.metadata)
    }

    // Log error stack if present
    if (entry.error && entry.error.stack) {
      console.error('  Stack:', entry.error.stack)
    }
  }

  // Database logging (buffered for performance)
  private async logToDatabase(entry: LogEntry): Promise<void> {
    this.buffer.push(entry)
    
    // Flush buffer if it's full
    if (this.buffer.length >= this.bufferSize) {
      await this.flushBuffer()
    }
  }

  // Flush log buffer to database
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return

    const logsToFlush = [...this.buffer]
    this.buffer = []

    try {
      const records = logsToFlush.map(entry => ({
        level: entry.level,
        category: entry.category,
        message: entry.message.substring(0, 1000), // Limit message length
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        user_id: entry.userId,
        session_id: entry.sessionId,
        request_id: entry.requestId,
        timestamp: entry.timestamp,
        duration: entry.duration,
        tags: entry.tags ? entry.tags.join(',') : null,
        environment: process.env.NODE_ENV,
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabaseAdmin
        .from('system_logs')
        .insert(records)

      if (error) {
        console.error('Failed to flush logs to database:', error)
        // Re-add failed logs to buffer for retry (with limit)
        if (this.buffer.length < this.bufferSize) {
          this.buffer.unshift(...logsToFlush.slice(0, this.bufferSize - this.buffer.length))
        }
      }
    } catch (error) {
      console.error('Error flushing logs to database:', error)
    }
  }

  // Send alerts for critical errors
  private async sendAlert(entry: LogEntry): Promise<void> {
    try {
      // Implementation would depend on alerting system (Slack, email, PagerDuty, etc.)
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        console.error(`🚨 ALERT [${entry.level}] ${entry.category}: ${entry.message}`)
        
        // Could integrate with:
        // - Slack webhooks
        // - Email notifications
        // - PagerDuty
        // - Custom alerting service
      }
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  // Graceful shutdown - flush remaining logs
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    await this.flushBuffer()
  }

  // Get log statistics
  async getLogStats(hours: number = 24): Promise<any> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabaseAdmin
        .from('system_logs')
        .select('level, category, created_at')
        .gte('created_at', since)
      
      if (error) {
        throw error
      }

      const stats = {
        total: data.length,
        levelBreakdown: {} as Record<string, number>,
        categoryBreakdown: {} as Record<string, number>,
        hourlyBreakdown: {} as Record<string, number>,
      }

      data.forEach(log => {
        // Level breakdown
        stats.levelBreakdown[log.level] = (stats.levelBreakdown[log.level] || 0) + 1
        
        // Category breakdown
        stats.categoryBreakdown[log.category] = (stats.categoryBreakdown[log.category] || 0) + 1
        
        // Hourly breakdown
        const hour = new Date(log.created_at).getHours().toString().padStart(2, '0')
        stats.hourlyBreakdown[hour] = (stats.hourlyBreakdown[hour] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting log stats:', error)
      return null
    }
  }
}

// Create singleton logger instance
export const logger = new Logger()

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await logger.shutdown()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await logger.shutdown()
    process.exit(0)
  })
}

// Export types and enums
export { Logger, LogLevel, LogCategory }

// Convenience functions
export const log = {
  debug: (category: LogCategory, message: string, metadata?: Record<string, any>) => 
    logger.debug(category, message, metadata),
  info: (category: LogCategory, message: string, metadata?: Record<string, any>) => 
    logger.info(category, message, metadata),
  warn: (category: LogCategory, message: string, metadata?: Record<string, any>) => 
    logger.warn(category, message, metadata),
  error: (category: LogCategory, message: string, error?: Error, metadata?: Record<string, any>) => 
    logger.error(category, message, error, metadata),
  fatal: (category: LogCategory, message: string, error?: Error, metadata?: Record<string, any>) => 
    logger.fatal(category, message, error, metadata),
}