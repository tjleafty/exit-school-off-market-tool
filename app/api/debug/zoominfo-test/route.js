import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('=== ZOOMINFO DEBUG TEST ===')

    // Get API key from database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('encrypted_key, status')
      .eq('service', 'zoominfo')
      .single()

    if (keyError || !apiKeyData) {
      return NextResponse.json({
        success: false,
        error: 'No ZoomInfo API key found in database',
        keyError: keyError?.message
      })
    }

    const apiKey = apiKeyData.encrypted_key
    const keyPreview = apiKey.substring(0, 20) + '...'

    console.log('API Key found:', keyPreview)
    console.log('API Key status in DB:', apiKeyData.status)

    // Try actual ZoomInfo API call
    const testCompanyName = 'Microsoft'
    const searchResponse = await fetch('https://api.zoominfo.com/search/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        companyName: testCompanyName,
        maxResults: 1
      })
    })

    console.log('ZoomInfo response status:', searchResponse.status)

    const responseText = await searchResponse.text()
    console.log('ZoomInfo response body:', responseText.substring(0, 500))

    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (e) {
      parsedResponse = { raw: responseText }
    }

    return NextResponse.json({
      success: searchResponse.ok,
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      apiKeyPreview: keyPreview,
      apiKeyStatus: apiKeyData.status,
      testCompany: testCompanyName,
      response: parsedResponse,
      responseHeaders: Object.fromEntries(searchResponse.headers.entries())
    })

  } catch (error) {
    console.error('Debug test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
