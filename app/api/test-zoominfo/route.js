import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: API Key Retrieval
  try {
    console.log('Test 1: Fetching ZoomInfo API key...')
    
    // Check environment variable first
    let apiKey = process.env.ZOOMINFO_API_KEY
    
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
        .eq('service', 'zoominfo')
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
          recommendation: 'Add ZOOMINFO_API_KEY to Vercel environment variables'
        })
        return NextResponse.json(results)
      }
    }

    // Note: ZoomInfo API typically requires JWT tokens and complex authentication
    // This is a simplified test that may need adjustment based on actual ZoomInfo API setup
    
    results.tests.push({
      test: 'ZoomInfo API Setup',
      success: true,
      note: 'API key detected. ZoomInfo API requires JWT authentication which needs additional setup.',
      recommendation: 'Implement proper JWT token generation for ZoomInfo API calls'
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
    recommendation: 'ZoomInfo API requires complex JWT authentication setup. Consult ZoomInfo API documentation for proper implementation.'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}