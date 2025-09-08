import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

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

    // Start with mock data only to isolate the issue
    let finalResults = []
    
    if (query) {
      console.log('API: Generating mock data for query:', query)
      finalResults = generateMockCompanies(query, filters)
      console.log('API: Generated', finalResults.length, 'mock companies')
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
  
  try {
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('service', 'google_places')
      .eq('status', 'Connected')
      .single()
    
    if (apiKeyData?.encrypted_key) {
      // In production, you'd decrypt this. For now, assume it's stored as plaintext
      apiKey = apiKeyData.encrypted_key
    }
  } catch (error) {
    console.log('No Google Places API key found in database, using environment variable')
  }
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
    throw new Error('Google Places API key not configured. Please add it in System Settings.')
  }
  
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
  
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
  const params = new URLSearchParams({
    query: searchQuery,
    key: apiKey,
    type: 'establishment'
  })
  
  if (nextPageToken && nextPageToken !== `page_1`) {
    params.append('pagetoken', nextPageToken)
  }
  
  const response = await fetch(`${url}?${params}`)
  
  if (!response.ok) {
    throw new Error(`Google Places API HTTP error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log('Google Places API response status:', data.status)
  
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
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