import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // Test 1: API Key Retrieval
  try {
    console.log('Test 1: Fetching OpenAI API key...')
    
    // Check environment variable first
    let apiKey = process.env.OPENAI_API_KEY
    
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
        .eq('service', 'openai')
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
          recommendation: 'Add OPENAI_API_KEY to Vercel environment variables'
        })
        return NextResponse.json(results)
      }
    }

    // Test 2: Simple OpenAI API Call
    console.log('Test 2: Making OpenAI API call...')
    const startTime = Date.now()
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const responseTime = Date.now() - startTime
    const data = await response.json()

    results.tests.push({
      test: 'OpenAI API Call (List Models)',
      success: response.ok,
      responseTime: `${responseTime}ms`,
      httpStatus: response.status,
      modelsCount: data.data?.length || 0,
      errorMessage: data.error?.message
    })

    // Test 3: Check for common issues
    if (!response.ok) {
      const issues = []
      
      if (response.status === 401) {
        issues.push('API key may be invalid or expired')
        issues.push('Check if API key is correctly formatted (starts with sk-)')
      }
      
      if (response.status === 429) {
        issues.push('Rate limit exceeded or quota reached')
        issues.push('Check OpenAI usage dashboard for quota limits')
      }
      
      if (response.status === 403) {
        issues.push('API access forbidden - check billing setup')
        issues.push('Ensure you have added payment method to OpenAI account')
      }
      
      results.tests.push({
        test: 'Diagnosis',
        possibleIssues: issues,
        recommendation: 'Check OpenAI API dashboard for account status and usage'
      })
    }

    // Test 4: Simple completion test (if models test passed)
    if (response.ok && data.data?.length > 0) {
      console.log('Test 3: Testing chat completion...')
      const completionStart = Date.now()
      const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Say "API test successful" in exactly 3 words.' }],
          max_tokens: 10,
          temperature: 0
        })
      })
      const completionTime = Date.now() - completionStart
      const completionData = await completionResponse.json()

      results.tests.push({
        test: 'Chat Completion Test',
        success: completionResponse.ok,
        responseTime: `${completionTime}ms`,
        httpStatus: completionResponse.status,
        response: completionData.choices?.[0]?.message?.content || 'No response',
        errorMessage: completionData.error?.message
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
      ? 'Check OpenAI API dashboard and ensure valid API key with sufficient credits'
      : 'OpenAI API is working correctly'
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}