import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    steps: [],
    recommendations: []
  }

  try {
    // Step 1: Get API Key from Database
    diagnostic.steps.push({ step: 'Fetching API key from database...' })
    
    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select('encrypted_key, status')
      .eq('service', 'google_places')
      .single()
    
    if (!apiKeyData?.encrypted_key) {
      diagnostic.steps.push({ 
        step: 'API key retrieval', 
        result: 'FAILED - No API key found in database',
        error: error?.message 
      })
      diagnostic.recommendations.push('Add Google Places API key to database')
      return NextResponse.json(diagnostic)
    }

    const apiKey = apiKeyData.encrypted_key
    diagnostic.steps.push({ 
      step: 'API key retrieval', 
      result: 'SUCCESS',
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 10) + '...'
    })

    // Step 2: Test Places API directly
    diagnostic.steps.push({ step: 'Testing Google Places API...' })
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant&key=${apiKey}`
    const placesResponse = await fetch(placesUrl)
    const placesData = await placesResponse.json()
    
    diagnostic.steps.push({
      step: 'Places API Test',
      httpStatus: placesResponse.status,
      apiStatus: placesData.status,
      errorMessage: placesData.error_message,
      results: placesData.results?.length || 0
    })

    // Step 3: Diagnose specific errors
    if (placesData.status === 'REQUEST_DENIED') {
      diagnostic.recommendations.push('✅ ENABLE Places API: Go to Google Cloud Console → APIs & Services → Library → Search "Places API" → Click ENABLE')
      diagnostic.recommendations.push('✅ CHECK API RESTRICTIONS: Go to APIs & Services → Credentials → Click your API key → Set "Application restrictions" to "None"')
      diagnostic.recommendations.push('✅ VERIFY API RESTRICTIONS: Under "API restrictions" → Either select "Don\'t restrict key" OR ensure "Places API" is selected')
      diagnostic.recommendations.push('✅ ENABLE BILLING: Go to Billing → Set up billing account (required even for free tier)')
      
      // Try to determine specific issue
      if (placesData.error_message?.includes('not activated')) {
        diagnostic.issue = 'Places API is not enabled in Google Cloud Console'
        diagnostic.solution = 'Go to APIs & Services → Library → Search "Places API" → Click ENABLE'
      } else if (placesData.error_message?.includes('API key not valid')) {
        diagnostic.issue = 'API key is invalid or has restrictions'
        diagnostic.solution = 'Check API key restrictions in Google Cloud Console'
      }
    }

    if (placesData.status === 'OVER_QUERY_LIMIT') {
      diagnostic.recommendations.push('Daily quota exceeded or billing not enabled')
      diagnostic.recommendations.push('Enable billing in Google Cloud Console')
    }

    // Step 4: Test Geocoding API (often required)
    diagnostic.steps.push({ step: 'Testing Geocoding API (often required with Places)...' })
    
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=San+Francisco&key=${apiKey}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    
    diagnostic.steps.push({
      step: 'Geocoding API Test',
      httpStatus: geocodeResponse.status,
      apiStatus: geocodeData.status,
      errorMessage: geocodeData.error_message
    })

    if (geocodeData.status === 'REQUEST_DENIED') {
      diagnostic.recommendations.push('Also enable Geocoding API in Google Cloud Console')
    }

    // Step 5: Check which APIs might need to be enabled
    const apisToCheck = [
      { name: 'Places API', required: true },
      { name: 'Maps JavaScript API', required: false },
      { name: 'Geocoding API', required: false },
      { name: 'Geolocation API', required: false }
    ]

    diagnostic.apisNeeded = apisToCheck
    
    // Final diagnosis
    if (placesData.status === 'OK') {
      diagnostic.status = '✅ SUCCESS - API is working!'
      diagnostic.message = 'Your Google Places API is configured correctly'
    } else {
      diagnostic.status = '❌ FAILED - Configuration issue detected'
      diagnostic.message = 'Follow the recommendations below to fix the issue'
    }

  } catch (error) {
    diagnostic.error = error.message
    diagnostic.status = '❌ ERROR'
  }

  return NextResponse.json(diagnostic, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}