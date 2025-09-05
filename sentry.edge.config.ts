import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring (lower for edge functions)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    
    // Debugging
    debug: process.env.NODE_ENV === 'development',
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    
    // Edge runtime specific configuration
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry edge event:', event, hint)
      }
      
      // Filter edge-specific errors
      const error = hint.originalException
      if (error && typeof error === 'object' && 'name' in error) {
        const errorName = (error as Error).name
        
        // Skip certain edge runtime errors
        const skipErrors = [
          'TimeoutError',
          'AbortError', 
          'NetworkError',
        ]
        
        if (skipErrors.includes(errorName)) {
          return null
        }
      }
      
      return event
    },
    
    initialScope: {
      tags: {
        component: 'edge',
        runtime: 'edge',
        feature: 'exit-school-off-market-tool',
      },
    },
  })
}

export { Sentry }