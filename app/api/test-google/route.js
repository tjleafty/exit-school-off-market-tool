import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: Database API Key Retrieval
  try {
    console.log('Test 1: Fetching API key from database...')
    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select('encrypted_key, status')
      .eq('service', 'google_places')
      .single()
    
    results.tests.push({
      test: 'Database API Key Retrieval',
      success: !!apiKeyData,
      status: apiKeyData?.status || 'Not found',
      hasKey: !!apiKeyData?.encrypted_key,
      error: error?.message
    })

    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json(results)
    }

    const apiKey = apiKeyData.encrypted_key

    // Test 2: Simple Google Places API Call
    console.log('Test 2: Making Google Places API call...')
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    const params = new URLSearchParams({
      query: 'coffee shop in San Francisco',
      key: apiKey,
      type: 'establishment'
    })

    const startTime = Date.now()
    const response = await fetch(`${url}?${params}`)
    const responseTime = Date.now() - startTime
    const data = await response.json()

    results.tests.push({
      test: 'Google Places API Call',
      success: data.status === 'OK',
      status: data.status,
      responseTime: `${responseTime}ms`,
      resultsCount: data.results?.length || 0,
      errorMessage: data.error_message,
      httpStatus: response.status
    })

    // Test 3: Check for common issues
    if (data.status !== 'OK') {
      const issues = []
      
      if (data.status === 'REQUEST_DENIED') {
        issues.push('API key may be invalid or restricted')
        issues.push('Check if Places API is enabled in Google Cloud Console')
        issues.push('Verify billing is enabled on Google Cloud Project')
      }
      
      if (data.status === 'OVER_QUERY_LIMIT') {
        issues.push('Daily quota exceeded or QPS limit reached')
        issues.push('Check Google Cloud Console for quota usage')
      }
      
      if (data.status === 'INVALID_REQUEST') {
        issues.push('Request parameters may be incorrect')
      }
      
      results.tests.push({
        test: 'Diagnosis',
        possibleIssues: issues,
        recommendation: 'Check Google Cloud Console for API status and quotas'
      })
    }

    // Test 4: Multiple rapid requests (rate limit test)
    console.log('Test 3: Testing rate limits...')
    const rateLimitTest = []
    for (let i = 0; i < 3; i++) {
      const testStart = Date.now()
      const testResponse = await fetch(`${url}?${params}`)
      const testData = await testResponse.json()
      rateLimitTest.push({
        attempt: i + 1,
        status: testData.status,
        time: `${Date.now() - testStart}ms`
      })
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    results.tests.push({
      test: 'Rate Limit Test (3 rapid requests)',
      results: rateLimitTest,
      allSucceeded: rateLimitTest.every(t => t.status === 'OK')
    })

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
      ? 'Check Google Cloud Console and ensure Places API is enabled with billing'
      : 'API is working correctly'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}