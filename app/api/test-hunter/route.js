import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: API Key Retrieval
  try {
    console.log('Test 1: Fetching Hunter.io API key...')
    
    // Check environment variable first
    let apiKey = process.env.HUNTER_API_KEY
    
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
        .eq('service', 'hunter')
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
          recommendation: 'Add HUNTER_API_KEY to Vercel environment variables'
        })
        return NextResponse.json(results)
      }
    }

    // Test 2: Account Information Call
    console.log('Test 2: Making Hunter.io account info call...')
    const startTime = Date.now()
    const response = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`)
    const responseTime = Date.now() - startTime
    const data = await response.json()

    results.tests.push({
      test: 'Hunter.io API Call (Account Info)',
      success: response.ok && data.data,
      responseTime: `${responseTime}ms`,
      httpStatus: response.status,
      requestsLeft: data.data?.requests?.searches?.left || 'Unknown',
      planName: data.data?.plan_name || 'Unknown',
      errorMessage: data.errors?.[0]?.details
    })

    // Test 3: Simple Domain Search (if account test passed)
    if (response.ok && data.data) {
      console.log('Test 3: Testing domain search...')
      const searchStart = Date.now()
      const searchResponse = await fetch(`https://api.hunter.io/v2/domain-search?domain=stripe.com&api_key=${apiKey}&limit=1`)
      const searchTime = Date.now() - searchStart
      const searchData = await searchResponse.json()

      results.tests.push({
        test: 'Domain Search Test',
        success: searchResponse.ok && searchData.data,
        responseTime: `${searchTime}ms`,
        httpStatus: searchResponse.status,
        emailsFound: searchData.data?.emails?.length || 0,
        companyName: searchData.data?.organization || 'Unknown',
        errorMessage: searchData.errors?.[0]?.details
      })
    }

    // Test 4: Check for common issues
    if (!response.ok || !data.data) {
      const issues = []
      
      if (response.status === 401) {
        issues.push('API key may be invalid or expired')
        issues.push('Check if API key is correctly formatted')
        issues.push('Verify API key in Hunter.io dashboard')
      }
      
      if (response.status === 429) {
        issues.push('Monthly request quota exceeded')
        issues.push('Check Hunter.io dashboard for usage limits')
        issues.push('Consider upgrading plan if needed')
      }
      
      if (response.status === 403) {
        issues.push('API access forbidden - check account status')
        issues.push('Ensure account is active and in good standing')
      }
      
      results.tests.push({
        test: 'Diagnosis',
        possibleIssues: issues,
        recommendation: 'Check Hunter.io dashboard for API key status and usage'
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
      ? 'Check Hunter.io dashboard and ensure valid API key with available requests'
      : 'Hunter.io API is working correctly'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}