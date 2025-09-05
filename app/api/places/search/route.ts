import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

interface GooglePlacesResult {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  business_status: string
  types: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

interface SearchRequest {
  industry: string
  city: string
  state: string
  radius?: number
  maxResults?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is active
    const { data: userProfile } = await supabase
      .from('users')
      .select('status, credits_remaining')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || userProfile.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account not active' }, { status: 403 })
    }

    // Check credits (if implementing credit system)
    if (userProfile.credits_remaining !== null && userProfile.credits_remaining <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    const { industry, city, state, radius = 50000, maxResults = 60 }: SearchRequest = await request.json()

    if (!industry || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: industry, city, state' },
        { status: 400 }
      )
    }

    // Build search query for Google Places
    const query = `${industry} in ${city}, ${state}`
    
    // Use Google Places Text Search API
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    placesUrl.searchParams.set('query', query)
    placesUrl.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY!)
    placesUrl.searchParams.set('type', 'establishment')

    const placesResponse = await fetch(placesUrl.toString())
    
    if (!placesResponse.ok) {
      throw new Error(`Google Places API error: ${placesResponse.statusText}`)
    }

    const placesData = await placesResponse.json()

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${placesData.status} - ${placesData.error_message || 'Unknown error'}`)
    }

    let results: GooglePlacesResult[] = placesData.results || []

    // Get additional details for each place
    const detailedResults = await Promise.all(
      results.slice(0, maxResults).map(async (place) => {
        try {
          const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
          detailsUrl.searchParams.set('place_id', place.place_id)
          detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,business_status,types')
          detailsUrl.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY!)

          const detailsResponse = await fetch(detailsUrl.toString())
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json()
            if (detailsData.status === 'OK') {
              return {
                ...place,
                ...detailsData.result
              }
            }
          }
          
          return place
        } catch (error) {
          console.error(`Error fetching details for place ${place.place_id}:`, error)
          return place
        }
      })
    )

    // Filter out closed businesses
    const activeResults = detailedResults.filter(place => 
      place.business_status !== 'CLOSED_PERMANENTLY' &&
      place.business_status !== 'CLOSED_TEMPORARILY'
    )

    // Transform to our format
    const companies = activeResults.map((place) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      rating: place.rating || null,
      review_count: place.user_ratings_total || null,
      business_status: place.business_status,
      types: place.types,
      latitude: place.geometry?.location?.lat || null,
      longitude: place.geometry?.location?.lng || null
    }))

    // Create search record
    const { data: searchRecord, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id: userProfile.id,
        industry,
        city,
        state,
        total_results: companies.length,
        search_parameters: {
          radius,
          maxResults,
          query
        }
      })
      .select()
      .single()

    if (searchError) {
      throw searchError
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_action: 'SEARCH_PERFORMED',
      p_entity: 'SEARCH',
      p_entity_id: searchRecord.id,
      p_metadata: {
        industry,
        city,
        state,
        results_count: companies.length,
        api_used: 'google_places'
      }
    })

    return NextResponse.json({
      success: true,
      searchId: searchRecord.id,
      results: companies,
      totalResults: companies.length,
      query: {
        industry,
        city,
        state
      }
    })

  } catch (error) {
    console.error('Places search error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      },
      { status: 500 }
    )
  }
}