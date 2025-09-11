import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  try {
    console.log('TEST: Starting Google Places API test...')
    
    // Check if API key exists
    let apiKey = process.env.GOOGLE_PLACES_API_KEY
    console.log('TEST: Environment API key exists:', !!apiKey)
    
    // Try to get API key from database
    try {
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('service', 'google_places')
        .eq('status', 'Connected')
        .single()
      
      if (apiKeyData?.encrypted_key) {
        apiKey = apiKeyData.encrypted_key
        console.log('TEST: Found API key in database')
      } else {
        console.log('TEST: No API key found in database')
      }
    } catch (error) {
      console.log('TEST: Database API key lookup failed:', error.message)
    }
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
      return NextResponse.json({
        success: false,
        error: 'No Google Places API key configured',
        details: 'API key not found in environment or database'
      })
    }
    
    // Test API call
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    const params = new URLSearchParams({
      query: 'restaurant',
      key: apiKey,
      type: 'establishment'
    })
    
    console.log('TEST: Making API call to:', `${url}?query=restaurant&key=***&type=establishment`)
    
    const response = await fetch(`${url}?${params}`)
    console.log('TEST: API response status:', response.status, response.statusText)
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Google Places API HTTP error: ${response.status} ${response.statusText}`,
        details: 'API request failed'
      })
    }
    
    const data = await response.json()
    console.log('TEST: API response status:', data.status)
    console.log('TEST: Results count:', data.results?.length || 0)
    
    return NextResponse.json({
      success: true,
      apiKeyConfigured: true,
      apiStatus: data.status,
      resultsCount: data.results?.length || 0,
      sampleResult: data.results?.[0]?.name || 'No results',
      fullResponse: data
    })
    
  } catch (error) {
    console.error('TEST: Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Test failed with exception'
    })
  }
}