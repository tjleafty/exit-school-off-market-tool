import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  try {
    console.log('=== ZOOMINFO JWT AUTHENTICATION TEST ===')

    // Test 1: Retrieve JWT credentials from database (support both schemas)
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('username, client_id, encrypted_key, additional_config, status')
      .eq('service', 'zoominfo')
      .single()

    if (keyError || !apiKeyData) {
      results.tests.push({
        test: 'Credentials Retrieval',
        success: false,
        error: 'No ZoomInfo credentials found in database'
      })
      return NextResponse.json(results)
    }

    // Extract credentials - support both old (separate columns) and new (additional_config) schemas
    let username, clientId, privateKey

    if (apiKeyData.additional_config) {
      console.log('Using credentials from additional_config JSON')
      username = apiKeyData.additional_config.username
      clientId = apiKeyData.additional_config.password || apiKeyData.additional_config.client_id
      privateKey = apiKeyData.encrypted_key
    } else {
      console.log('Using credentials from separate columns')
      username = apiKeyData.username
      clientId = apiKeyData.client_id
      privateKey = apiKeyData.encrypted_key
    }

    // Check all three required fields
    const hasUsername = !!(username && username.trim())
    const hasClientId = !!(clientId && clientId.trim())
    const hasPrivateKey = !!(privateKey && privateKey.trim())

    results.tests.push({
      test: 'Credentials Check',
      success: hasUsername && hasClientId && hasPrivateKey,
      username: hasUsername ? username : 'MISSING',
      clientId: hasClientId ? clientId.substring(0, 10) + '...' : 'MISSING',
      privateKey: hasPrivateKey ? 'Present (starts with: ' + privateKey.substring(0, 20) + '...)' : 'MISSING',
      status: apiKeyData.status,
      schemaType: apiKeyData.additional_config ? 'additional_config (JSON)' : 'separate columns'
    })

    if (!hasUsername || !hasClientId || !hasPrivateKey) {
      results.tests.push({
        test: 'Overall',
        success: false,
        error: 'Missing required credentials',
        recommendation: 'Go to Settings and enter Username, Client ID/Password, and Private Key for ZoomInfo'
      })
      return NextResponse.json(results)
    }

    // Test 2: Generate JWT token
    console.log('Generating JWT token...')
    const authClient = require('zoominfo-api-auth-client')

    let accessToken
    const tokenResult = await authClient.getAccessTokenViaPKI(
      username,
      clientId,
      privateKey
    )

    console.log('JWT token result type:', typeof tokenResult)
    console.log('JWT token result:', tokenResult)

    // Check if the result is an error object (library returns error instead of throwing)
    if (tokenResult && tokenResult.isAxiosError) {
      const errorMsg = tokenResult.response?.data?.message || tokenResult.message || 'Authentication failed'
      results.tests.push({
        test: 'JWT Token Generation',
        success: false,
        error: errorMsg,
        status: tokenResult.response?.status,
        statusText: tokenResult.response?.statusText,
        responseData: tokenResult.response?.data,
        recommendation: 'Check that username, client_id, and private key are correct in ZoomInfo Admin Portal'
      })
      return NextResponse.json(results)
    }

    // Success - tokenResult should be the JWT string
    accessToken = tokenResult

    results.tests.push({
      test: 'JWT Token Generation',
      success: true,
      tokenPreview: accessToken.substring(0, 20) + '...',
      note: 'Successfully generated JWT token'
    })

    // Test 3: Make actual API call to ZoomInfo
    console.log('Testing ZoomInfo API with JWT token...')
    const testCompany = 'Microsoft'

    const apiResponse = await fetch('https://api.zoominfo.com/search/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        companyName: testCompany
      })
    })

    const responseData = await apiResponse.json()

    results.tests.push({
      test: 'ZoomInfo API Call',
      success: apiResponse.ok,
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      testCompany: testCompany,
      foundResults: apiResponse.ok && responseData.data ? responseData.data.length : 0,
      response: apiResponse.ok ? 'Success' : responseData
    })

  } catch (error) {
    results.tests.push({
      test: 'Overall Test',
      success: false,
      error: error.message,
      stack: error.stack
    })
  }

  // Summary
  results.summary = {
    totalTests: results.tests.length,
    passed: results.tests.filter(t => t.success).length,
    failed: results.tests.filter(t => t.success === false).length,
    overallSuccess: results.tests.every(t => t.success)
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}