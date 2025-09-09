import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { query, location, type } = body // Remove apiKey from client request

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Fetch API key from database or environment variable
    let apiKey = process.env.GOOGLE_PLACES_API_KEY
    
    // Try to get from database first (more secure and updatable)
    try {
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('service', 'google_places')
        .eq('status', 'Connected')
        .single()
      
      if (apiKeyData?.encrypted_key) {
        apiKey = apiKeyData.encrypted_key
        console.log('Using Google Places API key from database')
      }
    } catch (error) {
      console.log('Database API key lookup failed, using environment variable')
    }

    if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'Google Places API key not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    const queryParams = new URLSearchParams({
      query: `${query} ${location || ''}`.trim(),
      key: apiKey,
    })

    if (type) {
      queryParams.append('type', type)
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${queryParams.toString()}`
    )

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
    }

    // Enrich each result with detailed information
    if (data.results && data.results.length > 0) {
      const enrichedResults = await Promise.all(
        data.results.map(async (place) => {
          try {
            // Get detailed information for each place
            const detailsParams = new URLSearchParams({
              place_id: place.place_id,
              fields: 'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,geometry,business_status,opening_hours,photos,types,price_level,reviews',
              key: apiKey,
            })

            const detailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`
            )

            const detailsData = await detailsResponse.json()

            if (detailsData.status === 'OK') {
              // Merge the detailed data with the original place data
              const detailsResult = detailsData.result
              
              return {
                ...place,
                ...detailsResult,
                // Ensure we always have valid geometry with location
                geometry: {
                  location: {
                    lat: detailsResult.geometry?.location?.lat || place.geometry?.location?.lat || 0,
                    lng: detailsResult.geometry?.location?.lng || place.geometry?.location?.lng || 0
                  },
                  ...detailsResult.geometry,
                  ...place.geometry
                }
              }
            } else {
              console.warn(`Failed to get details for ${place.name}:`, detailsData.status)
              return place // Return original if details fetch fails
            }
          } catch (detailError) {
            console.warn(`Error getting details for ${place.name}:`, detailError)
            return place // Return original if details fetch fails
          }
        })
      )

      data.results = enrichedResults
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Places search error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'ERROR'
      },
      { status: 500 }
    )
  }
}