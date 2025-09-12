import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: API Key Retrieval
  try {
    console.log('Test 1: Fetching Apollo.io API key...')
    
    // Check environment variable first
    let apiKey = process.env.APOLLO_API_KEY
    
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
        .eq('service', 'apollo')
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
          recommendation: 'Add APOLLO_API_KEY to Vercel environment variables'
        })
        return NextResponse.json(results)
      }
    }

    // Test 2: Account Info Call
    console.log('Test 2: Making Apollo.io account info call...')
    const startTime = Date.now()
    const response = await fetch('https://api.apollo.io/v1/auth/health', {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey
      }
    })
    const responseTime = Date.now() - startTime
    const data = await response.json()

    results.tests.push({
      test: 'Apollo.io API Call (Health Check)',
      success: response.ok,
      responseTime: `${responseTime}ms`,
      httpStatus: response.status,
      isAuthenticated: data.is_authenticated,
      errorMessage: data.message
    })

    // Test 3: Simple Organization Search (if health check passed)
    if (response.ok && data.is_authenticated) {
      console.log('Test 3: Testing organization search...')
      const searchStart = Date.now()
      const searchResponse = await fetch('https://api.apollo.io/v1/organizations/search', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify({
          q_organization_domains: ['apollo.io'],
          page: 1,
          per_page: 1
        })
      })
      const searchTime = Date.now() - searchStart
      const searchData = await searchResponse.json()

      results.tests.push({
        test: 'Organization Search Test',
        success: searchResponse.ok,
        responseTime: `${searchTime}ms`,
        httpStatus: searchResponse.status,
        organizationsFound: searchData.organizations?.length || 0,
        errorMessage: searchData.message
      })
    }

    // Test 4: Check for common issues
    if (!response.ok || !data.is_authenticated) {
      const issues = []
      
      if (response.status === 401 || response.status === 403) {
        issues.push('API key may be invalid or expired')
        issues.push('Check if API key is correctly formatted')
        issues.push('Verify API key in Apollo.io dashboard')
      }
      
      if (response.status === 429) {
        issues.push('Rate limit exceeded')
        issues.push('Check Apollo.io dashboard for usage limits')
        issues.push('Consider upgrading plan if needed')
      }
      
      results.tests.push({
        test: 'Diagnosis',
        possibleIssues: issues,
        recommendation: 'Check Apollo.io dashboard for API key status and usage'
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
      ? 'Check Apollo.io dashboard and ensure valid API key with available credits'
      : 'Apollo.io API is working correctly'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}