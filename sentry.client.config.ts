import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Debugging
    debug: process.env.NODE_ENV === 'development',
    
    // Session replay
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    
    integrations: [
      // Session replay
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        // Don't capture sensitive pages
        blockSelector: '[data-sentry-block]',
        maskSelector: '[data-sentry-mask]',
        // Sample rate for session replay
        sessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
        errorSampleRate: 1.0,
      }),
      
      // Performance monitoring
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.nextRouterInstrumentation,
        tracingOrigins: [
          'localhost',
          /^\//,
          /^https:\/\/.*\.vercel\.app/,
          /^https:\/\/.*\.supabase\.co/,
        ],
        // Trace interaction events
        tracingInteractions: ['click', 'submit', 'navigation'],
      }),
    ],
    
    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry event:', event, hint)
      }
      
      // Don't send events for certain error types
      if (event.exception) {
        const error = hint.originalException
        
        // Skip network errors that are expected
        if (error && typeof error === 'object' && 'name' in error) {
          const errorName = (error as Error).name
          if (errorName === 'AbortError' || errorName === 'NetworkError') {
            return null
          }
        }
        
        // Skip certain error messages
        const errorMessage = event.exception.values?.[0]?.value
        if (errorMessage) {
          const skipMessages = [
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded',
            'Script error',
            'Network request failed',
            'Loading chunk',
            'ChunkLoadError',
          ]
          
          if (skipMessages.some(msg => errorMessage.includes(msg))) {
            return null
          }
        }
      }
      
      // Scrub sensitive data
      if (event.request?.url) {
        // Remove sensitive query parameters
        const sensitiveParams = ['token', 'key', 'password', 'secret', 'api_key']
        const url = new URL(event.request.url)
        
        sensitiveParams.forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.set(param, '[Filtered]')
          }
        })
        
        event.request.url = url.toString()
      }
      
      // Scrub form data
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = { ...event.request.data }
        const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'credit_card', 'ssn']
        
        sensitiveFields.forEach(field => {
          if (field in data) {
            data[field] = '[Filtered]'
          }
        })
        
        event.request.data = data
      }
      
      return event
    },
    
    // Add custom context
    initialScope: {
      tags: {
        component: 'client',
        feature: 'exit-school-off-market-tool',
      },
    },
  })
  
  // Set user context if available
  if (typeof window !== 'undefined') {
    const updateUserContext = () => {
      const authData = localStorage.getItem('supabase.auth.token')
      if (authData) {
        try {
          const { user } = JSON.parse(authData)
          if (user) {
            Sentry.setUser({
              id: user.id,
              email: user.email,
              // Don't send sensitive information
            })
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
    
    // Update user context on load
    updateUserContext()
    
    // Listen for auth changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'supabase.auth.token') {
        updateUserContext()
      }
    })
  }
}

export { Sentry }