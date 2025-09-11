import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    console.log('TEST SEARCH: Starting...')
    const { query } = await request.json()
    
    // Get API key from database
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('service', 'google_places')
      .eq('status', 'Connected')
      .single()
    
    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json({
        success: false,
        error: 'No Google Places API key found'
      })
    }
    
    const apiKey = apiKeyData.encrypted_key
    console.log('TEST SEARCH: API key found')
    
    // Simple Google Places API call
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    const params = new URLSearchParams({
      query: query || 'restaurant',
      key: apiKey,
      type: 'establishment'
    })
    
    console.log('TEST SEARCH: Making API call...')
    const response = await fetch(`${url}?${params}`)
    const data = await response.json()
    
    console.log('TEST SEARCH: Response status:', data.status)
    console.log('TEST SEARCH: Results count:', data.results?.length || 0)
    
    return NextResponse.json({
      success: true,
      query: query || 'restaurant',
      apiStatus: data.status,
      resultsCount: data.results?.length || 0,
      sampleResults: data.results?.slice(0, 3).map(r => ({
        name: r.name,
        address: r.formatted_address,
        rating: r.rating
      })) || []
    })
    
  } catch (error) {
    console.error('TEST SEARCH: Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}