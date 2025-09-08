import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

// Simple in-memory cache to prevent duplicate requests
const activeRequests = new Map()

export async function POST(request) {
  try {
    console.log('API: Starting search request processing...')
    
    const body = await request.json()
    const { 
      query, 
      filters = {}, 
      page = 1, 
      limit = 20,
      userId,
      nextPageToken = null
    } = body

    console.log('API: Parsed request body:', { query, filters, page, limit, nextPageToken })

    // First, search existing real businesses in database
    let finalResults = []
    
    console.log('API: Searching database for existing businesses...')
    try {
      let searchQuery = supabase
        .from('companies')
        .select('*')
        .eq('source', 'google_places') // Only get real businesses from Google Places
        .order('created_at', { ascending: false })

      // Apply search filters
      if (query && query.trim()) {
        searchQuery = searchQuery.or(`name.ilike.%${query}%,industry.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`)
      }
      
      if (filters.city) {
        searchQuery = searchQuery.ilike('city', `%${filters.city}%`)
      }
      
      if (filters.state) {
        searchQuery = searchQuery.ilike('state', `%${filters.state}%`)
      }

      const startIndex = (page - 1) * limit
      searchQuery = searchQuery.range(startIndex, startIndex + limit - 1)

      const { data: companies, error } = await searchQuery

      if (error) {
        console.error('API: Database search error:', error)
      } else {
        finalResults = companies || []
        console.log('API: Found', finalResults.length, 'existing businesses in database')
      }
    } catch (dbError) {
      console.error('API: Database error:', dbError.message)
    }

    // If we don't have enough results, search Google Places API for more real business data
    let placesResults = []
    
    if (finalResults.length < limit && (query || filters.city || filters.state)) {
      console.log('API: Need more results, searching Google Places API...')
      
      // Create a unique key for this search to prevent duplicates
      const searchKey = JSON.stringify({ query, city: filters.city, state: filters.state, nextPageToken })
      
      // Check if this exact search is already in progress
      if (activeRequests.has(searchKey)) {
        console.log('API: Duplicate request detected, waiting for existing request...')
        try {
          const existingResult = await activeRequests.get(searchKey)
          placesResults = existingResult.companies || []
          console.log('API: Used cached result with', placesResults.length, 'businesses')
        } catch (error) {
          console.log('API: Cached request failed, proceeding with new request')
        }
      }
      
      if (placesResults.length === 0) {
        try {
          // Create promise for this search
          const searchPromise = searchGooglePlaces(query, filters, nextPageToken)
          activeRequests.set(searchKey, searchPromise)
          
          const placesResponse = await searchPromise
          placesResults = placesResponse.companies || []
          console.log('API: Google Places returned', placesResults.length, 'new real businesses')
          
          // Clean up the active request
          activeRequests.delete(searchKey)
        } catch (error) {
          activeRequests.delete(searchKey)
          throw error
        }
      }
        
        // Filter out duplicates (businesses already in database)
        const existingNames = new Set(finalResults.map(c => c.name.toLowerCase()))
        const uniqueResults = placesResults.filter(place => 
          !existingNames.has(place.name.toLowerCase())
        )
        
        console.log('API: After filtering duplicates:', uniqueResults.length, 'unique businesses')
        
        // Save new real business data to database
        if (uniqueResults.length > 0 && userId) {
          try {
            const { error: insertError } = await supabase
              .from('companies')
              .insert(uniqueResults.map(company => ({
                ...company,
                source: 'google_places',
                added_by: userId
              })))
            
            if (insertError) {
              console.error('API: Error saving real businesses to database:', insertError)
            } else {
              console.log('API: Successfully saved', uniqueResults.length, 'new businesses to database')
            }
          } catch (insertError) {
            console.error('API: Database insert error:', insertError.message)
          }
        }
        
        // Combine existing and new results
        finalResults = [...finalResults, ...uniqueResults]
        
      } catch (error) {
        console.error('API: Google Places API error:', error.message)
        // Continue with existing results if Google Places fails
      }
    }
    
    // Limit results to requested limit
    finalResults = finalResults.slice(0, limit)

    // Simple pagination logic
    let hasMoreResults = finalResults.length === limit
    let responseNextPageToken = hasMoreResults ? `page_${page + 1}` : null
    
    console.log('API: Returning response with', finalResults.length, 'companies')
    
    return NextResponse.json({
      success: true,
      companies: finalResults,
      total: finalResults.length,
      page,
      limit,
      hasMoreResults,
      nextPageToken: responseNextPageToken
    })

  } catch (error) {
    console.error('API: Company search error:', error)
    return NextResponse.json(
      { error: 'Failed to search companies', details: error.message },
      { status: 500 }
    )
  }
}

// Mock data generator for demo purposes
function generateMockCompanies(query, filters) {
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
    'Real Estate', 'Education', 'Consulting', 'Marketing', 'Logistics'
  ]
  
  const stages = ['Startup', 'Growth', 'Mature', 'Enterprise']
  const employeeRanges = ['1-10', '11-50', '51-200', '201-500', '500+']
  const revenueRanges = ['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+']
  
  const mockCompanies = []
  const numResults = Math.floor(Math.random() * 10) + 5 // 5-15 results
  
  for (let i = 0; i < numResults; i++) {
    mockCompanies.push({
      id: `mock-${Date.now()}-${i}`,
      name: `${query} Company ${i + 1}`,
      website: `https://www.${query.toLowerCase().replace(/\s+/g, '')}${i + 1}.com`,
      industry: filters.industry || industries[Math.floor(Math.random() * industries.length)],
      location: filters.location || `City ${i + 1}, State`,
      city: `City ${i + 1}`,
      state: 'State',
      country: 'USA',
      employees_range: filters.employeesRange || employeeRanges[Math.floor(Math.random() * employeeRanges.length)],
      revenue_range: filters.revenueRange || revenueRanges[Math.floor(Math.random() * revenueRanges.length)],
      company_stage: filters.stage || stages[Math.floor(Math.random() * stages.length)],
      description: `A leading company in ${filters.industry || 'the industry'} specializing in ${query} services and solutions.`,
      founded_year: 2010 + Math.floor(Math.random() * 14),
      linkedin_url: `https://linkedin.com/company/${query.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      is_enriched: false
    })
  }
  
  return mockCompanies
}

// Google Places API integration
async function searchGooglePlaces(query, filters, nextPageToken) {
  // Try to get API key from database first, then fall back to environment
  let apiKey = process.env.GOOGLE_PLACES_API_KEY
  console.log('PLACES: Environment API key exists:', !!apiKey)
  
  try {
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('service', 'google_places')
      .eq('status', 'Connected')
      .single()
    
    if (apiKeyData?.encrypted_key) {
      apiKey = apiKeyData.encrypted_key
      console.log('PLACES: Using API key from database')
    } else {
      console.log('PLACES: No API key found in database')
    }
  } catch (error) {
    console.log('PLACES: Database API key lookup failed:', error.message)
  }
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
    throw new Error('Google Places API key not configured. Please add it in System Settings.')
  }
  
  console.log('PLACES: API key configured, proceeding with search')
  
  // Build search query for Google Places
  let searchQuery = ''
  if (query) {
    searchQuery = query
  }
  
  // Add location to search query
  if (filters.city && filters.state) {
    searchQuery += ` ${filters.city} ${filters.state}`
  } else if (filters.city) {
    searchQuery += ` ${filters.city}`
  } else if (filters.state) {
    searchQuery += ` ${filters.state}`
  }
  
  if (!searchQuery.trim()) {
    searchQuery = 'business'
  }
  
  console.log('PLACES: Final search query:', searchQuery)
  
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
  const params = new URLSearchParams({
    query: searchQuery,
    key: apiKey,
    type: 'establishment'
  })
  
  if (nextPageToken && nextPageToken !== `page_1`) {
    params.append('pagetoken', nextPageToken)
  }
  
  console.log('PLACES: Making API call to Google Places...')
  
  // Add retry logic for reliability
  let response, data;
  let retries = 3;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`PLACES: Attempt ${attempt}/${retries}`)
      response = await fetch(`${url}?${params}`, {
        timeout: 10000 // 10 second timeout
      })
      
      console.log('PLACES: Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        if (response.status === 429) { // Rate limited
          console.log('PLACES: Rate limited, waiting before retry...')
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Progressive backoff
          continue
        }
        throw new Error(`Google Places API HTTP error: ${response.status} ${response.statusText}`)
      }
      
      data = await response.json()
      console.log('PLACES: Google Places API response status:', data.status)
      console.log('PLACES: Results count:', data.results?.length || 0)
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        break // Success
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.log('PLACES: Over query limit, waiting before retry...')
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        continue
      } else {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
      }
    } catch (error) {
      console.log(`PLACES: Attempt ${attempt} failed:`, error.message)
      if (attempt === retries) {
        throw error // Re-throw on final attempt
      }
      await new Promise(resolve => setTimeout(resolve, 500 * attempt)) // Wait before retry
    }
  }
  
  if (data.results?.length > 0) {
    console.log('PLACES: Sample result:', data.results[0].name)
  }
  
  // Convert Google Places results to our format
  const companies = data.results?.map(place => {
    // Extract location components
    const addressComponents = place.formatted_address?.split(', ') || []
    const city = addressComponents[addressComponents.length - 3] || ''
    const stateZip = addressComponents[addressComponents.length - 2] || ''
    const state = stateZip?.split(' ')[0] || ''
    const country = addressComponents[addressComponents.length - 1] || 'USA'
    
    // Map place types to industries
    const industryMap = {
      'restaurant': 'Food & Beverage',
      'store': 'Retail',
      'bank': 'Finance',
      'hospital': 'Healthcare',
      'school': 'Education',
      'gym': 'Fitness & Recreation',
      'beauty_salon': 'Beauty & Wellness',
      'car_dealer': 'Automotive',
      'real_estate_agency': 'Real Estate',
      'lawyer': 'Legal Services',
      'accounting': 'Professional Services'
    }
    
    const primaryType = place.types?.[0] || 'establishment'
    const industry = industryMap[primaryType] || 
      (query ? query.charAt(0).toUpperCase() + query.slice(1) : 'General Business')
    
    return {
      id: `google-${place.place_id}`,
      name: place.name,
      website: null, // Would need Place Details API call to get website
      industry: industry,
      location: place.formatted_address,
      city: city,
      state: state,
      country: country,
      employees_range: '1-50', // Default estimate
      revenue_range: '$1M-$10M', // Default estimate
      company_stage: 'Established',
      description: `Business located at ${place.formatted_address}. ${place.types?.join(', ')}.`,
      founded_year: null,
      linkedin_url: null,
      phone: null,
      email: null,
      address: place.formatted_address,
      is_enriched: false,
      google_place_id: place.place_id,
      google_rating: place.rating,
      google_user_ratings_total: place.user_ratings_total
    }
  }) || []
  
  return {
    companies,
    nextPageToken: data.next_page_token || null
  }
}