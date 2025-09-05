import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Debugging  
    debug: process.env.NODE_ENV === 'development',
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    
    integrations: [
      // Node.js specific integrations
      new Sentry.Integrations.Http({ 
        tracing: true,
        breadcrumbs: true,
      }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    // Server-specific options
    beforeSend(event, hint) {
      // Filter server-side errors
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry server event:', event, hint)
      }
      
      // Don't send expected errors
      const error = hint.originalException
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code
        
        // Skip certain database errors
        const skipCodes = [
          'PGRST116', // Supabase row level security
          'ECONNRESET', // Network connection reset
          'ENOTFOUND', // DNS lookup failed
          'ETIMEDOUT', // Connection timeout
        ]
        
        if (skipCodes.includes(errorCode)) {
          return null
        }
      }
      
      // Scrub sensitive server data
      if (event.request?.data) {
        const data = { ...event.request.data }
        const sensitiveFields = [
          'password', 
          'token', 
          'secret', 
          'api_key', 
          'private_key',
          'service_role_key',
          'database_url',
        ]
        
        sensitiveFields.forEach(field => {
          if (field in data) {
            data[field] = '[Filtered]'
          }
        })
        
        event.request.data = data
      }
      
      // Scrub environment variables from context
      if (event.contexts?.runtime?.name === 'node') {
        delete event.contexts.runtime
      }
      
      return event
    },
    
    // Add custom context for server
    initialScope: {
      tags: {
        component: 'server',
        feature: 'exit-school-off-market-tool',
      },
    },
  })
}

export { Sentry }