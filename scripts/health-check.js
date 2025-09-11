#!/usr/bin/env node

/**
 * Health Check Script
 * Monitors application health and services
 */

const https = require('https')
const http = require('http')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuration
const CONFIG = {
  app_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  timeout: 10000, // 10 seconds
  retry_attempts: 3,
  retry_delay: 2000 // 2 seconds
}

// Health check functions
async function checkHTTP(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const req = client.get(url, { timeout: CONFIG.timeout }, (res) => {
      resolve({
        success: res.statusCode === expectedStatus,
        status: res.statusCode,
        message: `HTTP ${res.statusCode}`,
        response_time: Date.now() - startTime
      })
    })
    
    const startTime = Date.now()
    
    req.on('error', (error) => {
      resolve({
        success: false,
        status: 0,
        message: error.message,
        response_time: Date.now() - startTime
      })
    })
    
    req.on('timeout', () => {
      req.destroy()
      resolve({
        success: false,
        status: 0,
        message: 'Request timeout',
        response_time: CONFIG.timeout
      })
    })
  })
}

async function checkDatabase() {
  const startTime = Date.now()
  
  try {
    // Simple query to test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    return {
      success: !error,
      message: error ? error.message : 'Database connection successful',
      response_time: Date.now() - startTime,
      record_count: data ? data.length : 0
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      response_time: Date.now() - startTime
    }
  }
}

async function checkEdgeFunctions() {
  const functions = [
    'send-invitation',
    'generate-report',
    'enrich-company'
  ]
  
  const results = {}
  
  for (const functionName of functions) {
    const startTime = Date.now()
    
    try {
      // Just check if the function is reachable (404 is OK, means it exists)
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        signal: AbortSignal.timeout(CONFIG.timeout)
      })
      
      results[functionName] = {
        success: response.status !== 503, // 503 means service unavailable
        status: response.status,
        message: response.status === 404 ? 'Function exists but needs valid request' : `HTTP ${response.status}`,
        response_time: Date.now() - startTime
      }
    } catch (error) {
      results[functionName] = {
        success: false,
        status: 0,
        message: error.message,
        response_time: Date.now() - startTime
      }
    }
  }
  
  return results
}

async function checkEmailService() {
  const startTime = Date.now()
  
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY not configured',
        response_time: Date.now() - startTime
      }
    }
    
    // Simple API check (this won't send an email)
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      signal: AbortSignal.timeout(CONFIG.timeout)
    })
    
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Email service accessible' : `HTTP ${response.status}`,
      response_time: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      response_time: Date.now() - startTime
    }
  }
}

async function checkExternalAPIs() {
  const apis = {
    google_places: {
      url: 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=' + process.env.GOOGLE_PLACES_API_KEY,
      required: !!process.env.GOOGLE_PLACES_API_KEY
    },
    openai: {
      url: 'https://api.openai.com/v1/models',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      required: !!process.env.OPENAI_API_KEY
    }
  }
  
  const results = {}
  
  for (const [apiName, config] of Object.entries(apis)) {
    const startTime = Date.now()
    
    if (!config.required) {
      results[apiName] = {
        success: null,
        message: 'API key not configured',
        response_time: 0
      }
      continue
    }
    
    try {
      const response = await fetch(config.url, {
        headers: config.headers || {},
        signal: AbortSignal.timeout(CONFIG.timeout)
      })
      
      results[apiName] = {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'API accessible' : `HTTP ${response.status}`,
        response_time: Date.now() - startTime
      }
    } catch (error) {
      results[apiName] = {
        success: false,
        message: error.message,
        response_time: Date.now() - startTime
      }
    }
  }
  
  return results
}

function formatResult(name, result, indent = 0) {
  const spaces = '  '.repeat(indent)
  const icon = result.success === true ? '✅' : result.success === false ? '❌' : '⚪'
  const time = result.response_time ? `(${result.response_time}ms)` : ''
  
  console.log(`${spaces}${icon} ${name}: ${result.message} ${time}`)
  
  if (result.status) {
    console.log(`${spaces}   Status: ${result.status}`)
  }
}

async function runHealthCheck() {
  console.log('🏥 Running health check...')
  console.log('=' .repeat(60))
  
  const results = {
    timestamp: new Date().toISOString(),
    overall: true,
    checks: {}
  }
  
  // Check main application
  console.log('🌐 Application Health:')
  const appCheck = await checkHTTP(`${CONFIG.app_url}/api/health`)
  results.checks.application = appCheck
  formatResult('Main Application', appCheck, 1)
  
  if (!appCheck.success) {
    results.overall = false
  }
  
  console.log('')
  
  // Check database
  console.log('🗄️  Database Health:')
  const dbCheck = await checkDatabase()
  results.checks.database = dbCheck
  formatResult('Database Connection', dbCheck, 1)
  
  if (!dbCheck.success) {
    results.overall = false
  }
  
  console.log('')
  
  // Check Edge Functions
  console.log('⚡ Edge Functions Health:')
  const edgeFunctionsCheck = await checkEdgeFunctions()
  results.checks.edge_functions = edgeFunctionsCheck
  
  for (const [functionName, result] of Object.entries(edgeFunctionsCheck)) {
    formatResult(functionName, result, 1)
    if (!result.success) {
      results.overall = false
    }
  }
  
  console.log('')
  
  // Check Email Service
  console.log('📧 Email Service Health:')
  const emailCheck = await checkEmailService()
  results.checks.email = emailCheck
  formatResult('Resend API', emailCheck, 1)
  
  if (!emailCheck.success) {
    results.overall = false
  }
  
  console.log('')
  
  // Check External APIs
  console.log('🌍 External APIs Health:')
  const externalAPIsCheck = await checkExternalAPIs()
  results.checks.external_apis = externalAPIsCheck
  
  for (const [apiName, result] of Object.entries(externalAPIsCheck)) {
    formatResult(`${apiName} API`, result, 1)
    if (result.success === false) {
      results.overall = false
    }
  }
  
  console.log('')
  console.log('=' .repeat(60))
  
  // Overall result
  if (results.overall) {
    console.log('✅ Overall Health: HEALTHY')
    console.log('🎉 All systems operational!')
  } else {
    console.log('❌ Overall Health: UNHEALTHY')
    console.log('⚠️  Some systems need attention')
  }
  
  console.log('')
  console.log(`📊 Health check completed at ${new Date().toLocaleString()}`)
  
  // Save results to file
  const fs = require('fs')
  const path = require('path')
  const logsDir = path.join(process.cwd(), 'logs')
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logFile = path.join(logsDir, `health-check-${timestamp}.json`)
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2))
  
  console.log(`💾 Results saved to: ${path.relative(process.cwd(), logFile)}`)
  
  // Exit with error code if unhealthy (useful for CI/CD)
  process.exit(results.overall ? 0 : 1)
}

// Main function
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'monitor':
      console.log('🔄 Starting continuous health monitoring...')
      console.log('Press Ctrl+C to stop')
      
      const interval = parseInt(process.argv[3]) || 60 // Default 60 seconds
      
      setInterval(async () => {
        try {
          await runHealthCheck()
        } catch (error) {
          console.error('❌ Health check failed:', error.message)
        }
        console.log('\n' + '─'.repeat(60) + '\n')
      }, interval * 1000)
      break
      
    case 'json':
      // JSON output for programmatic use
      const results = await getHealthCheckResults()
      console.log(JSON.stringify(results, null, 2))
      process.exit(results.overall ? 0 : 1)
      break
      
    default:
      await runHealthCheck()
      break
  }
}

async function getHealthCheckResults() {
  const results = {
    timestamp: new Date().toISOString(),
    overall: true,
    checks: {}
  }
  
  // Run all checks
  const appCheck = await checkHTTP(`${CONFIG.app_url}/api/health`)
  const dbCheck = await checkDatabase()
  const emailCheck = await checkEmailService()
  const edgeFunctionsCheck = await checkEdgeFunctions()
  const externalAPIsCheck = await checkExternalAPIs()
  
  results.checks = {
    application: appCheck,
    database: dbCheck,
    email: emailCheck,
    edge_functions: edgeFunctionsCheck,
    external_apis: externalAPIsCheck
  }
  
  // Determine overall health
  if (!appCheck.success || !dbCheck.success || !emailCheck.success) {
    results.overall = false
  }
  
  for (const result of Object.values(edgeFunctionsCheck)) {
    if (!result.success) {
      results.overall = false
      break
    }
  }
  
  for (const result of Object.values(externalAPIsCheck)) {
    if (result.success === false) {
      results.overall = false
      break
    }
  }
  
  return results
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Health check stopped')
  process.exit(0)
})

// Run the script
main()