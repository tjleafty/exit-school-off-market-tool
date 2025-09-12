import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: API Key Retrieval
  try {
    console.log('Test 1: Fetching Resend API key...')
    
    // Check environment variable first
    let apiKey = process.env.RESEND_API_KEY
    
    if (apiKey) {
      console.log('Using API key from environment variable')
      results.tests.push({
        test: 'API Key Retrieval',
        success: true,
        source: 'Environment Variable (Persistent)',
        hasKey: true
      })
    } else {
      console.log('No environment variable, checking database...')
      const { data: apiKeyData, error } = await supabase
        .from('api_keys')
        .select('encrypted_key, status')
        .eq('service', 'resend')
        .single()
      
      if (apiKeyData?.encrypted_key) {
        apiKey = apiKeyData.encrypted_key
        results.tests.push({
          test: 'API Key Retrieval',
          success: true,
          source: 'Database',
          status: apiKeyData.status,
          hasKey: true
        })
      } else {
        results.tests.push({
          test: 'API Key Retrieval',
          success: false,
          error: 'No API key found in environment or database',
          recommendation: 'Add RESEND_API_KEY to Vercel environment variables'
        })
        return NextResponse.json(results)
      }
    }

    // Test 2: API Health Check
    console.log('Test 2: Making Resend API health check...')
    const startTime = Date.now()
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const responseTime = Date.now() - startTime
    const data = await response.json()

    results.tests.push({
      test: 'Resend API Call (Domains List)',
      success: response.ok,
      responseTime: `${responseTime}ms`,
      httpStatus: response.status,
      domainsCount: Array.isArray(data.data) ? data.data.length : 0,
      errorMessage: data.message
    })

    // Test 3: Check for common issues
    if (!response.ok) {
      const issues = []
      
      if (response.status === 401) {
        issues.push('API key may be invalid or expired')
        issues.push('Check if API key is correctly formatted (starts with re_)')
        issues.push('Verify API key in Resend dashboard')
      }
      
      if (response.status === 429) {
        issues.push('Rate limit exceeded')
        issues.push('Check Resend dashboard for usage limits')
      }
      
      if (response.status === 403) {
        issues.push('API access forbidden - check account status')
        issues.push('Ensure account is verified and in good standing')
      }
      
      results.tests.push({
        test: 'Diagnosis',
        possibleIssues: issues,
        recommendation: 'Check Resend dashboard for API key status and account verification'
      })
    }

  } catch (error) {
    results.tests.push({
      test: 'Overall Test',
      success: false,
      error: error.message
    })
  }

  // Summary
  results.summary = {
    totalTests: results.tests.length,
    passed: results.tests.filter(t => t.success).length,
    failed: results.tests.filter(t => t.success === false).length,
    recommendation: results.tests.some(t => !t.success) 
      ? 'Check Resend dashboard and ensure valid API key with verified account'
      : 'Resend API is working correctly'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}