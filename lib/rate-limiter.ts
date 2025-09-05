import { NextRequest, NextResponse } from 'next/server'
import { logger, LogCategory } from './logger'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

// Default configurations for different endpoint types
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 50 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  },
  
  // Search endpoints (moderate restrictions)
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Search rate limit exceeded, please wait before searching again.',
  },
  
  // Email sending (very restrictive)
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100, // 100 emails per hour
    message: 'Email sending limit exceeded, please try again later.',
  },
  
  // Report generation (restrictive)
  reports: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 reports per hour
    message: 'Report generation limit exceeded, please try again later.',
  },
  
  // Health checks (very permissive)
  health: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 health checks per minute
    message: 'Health check rate limit exceeded.',
  },
} as const

// In-memory store for rate limiting (use Redis in production)
class InMemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key)
        }
      }
    }, 5 * 60 * 1000)
  }

  async increment(key: string, windowMs: number): Promise<{ totalHits: number; timeToReset: number }> {
    const now = Date.now()
    const resetTime = now + windowMs
    const existing = this.store.get(key)

    if (!existing || now > existing.resetTime) {
      // First request or window expired
      this.store.set(key, { count: 1, resetTime })
      return { totalHits: 1, timeToReset: resetTime }
    } else {
      // Increment existing count
      existing.count++
      this.store.set(key, existing)
      return { totalHits: existing.count, timeToReset: existing.resetTime }
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global store instance
const store = new InMemoryStore()

// Rate limiting function
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { windowMs, maxRequests, keyGenerator } = config
  
  // Generate key for rate limiting
  const key = keyGenerator ? keyGenerator(request) : getDefaultKey(request)
  
  try {
    const { totalHits, timeToReset } = await store.increment(key, windowMs)
    const remaining = Math.max(0, maxRequests - totalHits)
    const success = totalHits <= maxRequests

    // Log rate limit violations
    if (!success) {
      await logger.warn(LogCategory.SECURITY, 'Rate limit exceeded', {
        key,
        totalHits,
        maxRequests,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        path: new URL(request.url).pathname,
      })
    }

    return {
      success,
      limit: maxRequests,
      remaining,
      reset: Math.ceil(timeToReset / 1000), // Convert to seconds
    }
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    await logger.error(LogCategory.SECURITY, 'Rate limiting error', error as Error, {
      key,
      path: new URL(request.url).pathname,
    })
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      reset: Math.ceil((Date.now() + windowMs) / 1000),
    }
  }
}

// Default key generator (IP-based)
function getDefaultKey(request: NextRequest): string {
  const ip = getClientIP(request)
  const path = new URL(request.url).pathname
  return `${ip}:${path}`
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || cfIP || 'unknown'
}

// User-based key generator
export function createUserBasedKey(request: NextRequest): string {
  const userId = request.headers.get('x-user-id') // Set by auth middleware
  const ip = getClientIP(request)
  const path = new URL(request.url).pathname
  
  return userId ? `user:${userId}:${path}` : `ip:${ip}:${path}`
}

// Middleware wrapper for rate limiting
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await rateLimit(request, config)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: config.message || 'Rate limit exceeded',
          retryAfter: result.reset - Math.ceil(Date.now() / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': (result.reset - Math.ceil(Date.now() / 1000)).toString(),
          }
        }
      )
    }
    
    const response = await handler(request)
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())
    
    return response
  }
}

// IP whitelist for bypassing rate limits (for monitoring, health checks, etc.)
const whitelistedIPs = new Set([
  '127.0.0.1',
  '::1',
  // Add monitoring service IPs here
])

// Check if IP is whitelisted
export function isWhitelisted(request: NextRequest): boolean {
  const ip = getClientIP(request)
  return whitelistedIPs.has(ip)
}

// Enhanced rate limiting with whitelist support
export async function rateLimitWithWhitelist(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Skip rate limiting for whitelisted IPs
  if (isWhitelisted(request)) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Math.ceil((Date.now() + config.windowMs) / 1000),
    }
  }
  
  return rateLimit(request, config)
}

// Sliding window rate limiter for more accurate rate limiting
export class SlidingWindowRateLimiter {
  private store = new Map<string, number[]>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, timestamps] of this.store.entries()) {
        // Remove timestamps older than 1 hour
        const filtered = timestamps.filter(ts => now - ts < 60 * 60 * 1000)
        if (filtered.length === 0) {
          this.store.delete(key)
        } else {
          this.store.set(key, filtered)
        }
      }
    }, 60 * 1000)
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get existing timestamps for this key
    const timestamps = this.store.get(key) || []
    
    // Filter timestamps within the current window
    const validTimestamps = timestamps.filter(ts => ts > windowStart)
    
    // Add current timestamp
    validTimestamps.push(now)
    
    // Store updated timestamps
    this.store.set(key, validTimestamps)
    
    const success = validTimestamps.length <= maxRequests
    const remaining = Math.max(0, maxRequests - validTimestamps.length)
    const oldestInWindow = Math.min(...validTimestamps)
    const reset = Math.ceil((oldestInWindow + windowMs) / 1000)
    
    return { success, remaining, reset }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global sliding window limiter instance
const slidingWindowLimiter = new SlidingWindowRateLimiter()

// Sliding window rate limiting function
export async function slidingWindowRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)
  
  try {
    const result = await slidingWindowLimiter.checkLimit(
      key,
      config.maxRequests,
      config.windowMs
    )
    
    // Log rate limit violations
    if (!result.success) {
      await logger.warn(LogCategory.SECURITY, 'Sliding window rate limit exceeded', {
        key,
        limit: config.maxRequests,
        ip: getClientIP(request),
        path: new URL(request.url).pathname,
      })
    }

    return {
      success: result.success,
      limit: config.maxRequests,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    await logger.error(LogCategory.SECURITY, 'Sliding window rate limiting error', error as Error)
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Math.ceil((Date.now() + config.windowMs) / 1000),
    }
  }
}

// Clean up function for graceful shutdown
export function cleanup(): void {
  store.destroy()
  slidingWindowLimiter.destroy()
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
}

export { InMemoryStore }