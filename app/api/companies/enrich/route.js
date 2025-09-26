import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  console.log('Enrichment API called at:', new Date().toISOString())

  try {
    const body = await request.json()
    console.log('Request body received:', JSON.stringify(body, null, 2))

    const { companyId, companyData } = body

    if (!companyId && !companyData) {
      console.error('Missing required parameters:', { companyId, companyData })
      return NextResponse.json(
        { error: 'Company ID or data is required' },
        { status: 400 }
      )
    }

    console.log('Processing enrichment for:', companyId ? `ID: ${companyId}` : `Data: ${companyData?.name}`)

    // If we have company data from Google Places, enrich it
    let enrichedData = companyData || {}

    // Step 1: Get more details from Google Places if we have a place_id
    console.log('Step 1: Google Places enrichment')
    if (companyData?.place_id) {
      console.log('Place ID found:', companyData.place_id)
      const apiKey = process.env.GOOGLE_PLACES_API_KEY

      if (apiKey) {
        console.log('Google Places API key available, fetching details')
        try {
          const detailsParams = new URLSearchParams({
            place_id: companyData.place_id,
            fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,opening_hours,types,price_level,reviews,editorial_summary,current_opening_hours,business_status',
            key: apiKey
          })

          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`
          )

          if (!detailsResponse.ok) {
            throw new Error(`HTTP error! status: ${detailsResponse.status}`)
          }

          const detailsData = await detailsResponse.json()
          console.log('Google Places API response status:', detailsData.status)

          if (detailsData.status === 'OK' && detailsData.result) {
            console.log('Google Places data enriched successfully')
            enrichedData = {
              ...enrichedData,
              ...detailsData.result,
              phone: detailsData.result.formatted_phone_number || detailsData.result.international_phone_number,
              business_status: detailsData.result.business_status,
              editorial_summary: detailsData.result.editorial_summary?.overview,
              total_reviews: detailsData.result.user_ratings_total,
              opening_hours: detailsData.result.current_opening_hours?.weekday_text
            }
          } else {
            console.warn('Google Places API returned non-OK status:', detailsData.status, detailsData.error_message)
          }
        } catch (error) {
          console.error('Error fetching place details:', error)
        }
      }
    }

    // Step 2: Advanced email finding with Hunter.io
    console.log('Step 2: Email enrichment with Hunter.io')
    if (enrichedData.website && !enrichedData.email) {
      console.log('Website found, attempting email enrichment:', enrichedData.website)
      try {
        const hunterData = await fetchFromHunter(enrichedData.website)
        if (hunterData.owner_email) {
          console.log('Hunter.io email found:', hunterData.owner_email)
          enrichedData.email = hunterData.owner_email
          enrichedData.owner_name = hunterData.owner_name
          enrichedData.email_confidence = 'high'
          enrichedData.enrichment_source = 'google_places_hunter'
        } else {
          // Fallback to domain-based email
          const domain = new URL(enrichedData.website).hostname.replace('www.', '')
          enrichedData.email = `contact@${domain}`
          enrichedData.email_confidence = 'low'
          console.log('Hunter.io no results, using fallback email:', enrichedData.email)
        }
      } catch (error) {
        console.warn('Hunter.io enrichment failed:', error.message)
        // Fallback to domain-based email
        try {
          const domain = new URL(enrichedData.website).hostname.replace('www.', '')
          enrichedData.email = `contact@${domain}`
          enrichedData.email_confidence = 'low'
          console.log('Using fallback email due to Hunter error:', enrichedData.email)
        } catch (urlError) {
          console.error('Failed to parse website URL for fallback email:', urlError.message)
        }
      }
    } else {
      console.log('Skipping email enrichment:', !enrichedData.website ? 'No website' : 'Email already exists')
    }

    // Step 3: Apollo.io enrichment for company data
    console.log('Step 3: Apollo.io enrichment')
    try {
      const apolloData = await fetchFromApollo(enrichedData)
      console.log('Apollo.io response received:', apolloData)

      // Only set employee data if we got actual numbers (not "Data not verified")
      if (apolloData.employee_count && apolloData.employee_count !== 'Data not verified') {
        enrichedData.employee_count = apolloData.employee_count
        enrichedData.employees_range = getEmployeeRange(apolloData.employee_count)
        console.log('Apollo employee data added:', apolloData.employee_count)
      } else {
        enrichedData.employee_count = 'Data not verified'
        enrichedData.employees_range = 'Data not verified'
        console.log('Apollo employee data not available')
      }

      // Only set revenue data if we got actual numbers (not "Data not verified")
      if (apolloData.revenue && apolloData.revenue !== 'Data not verified') {
        enrichedData.revenue = apolloData.revenue
        enrichedData.revenue_range = getRevenueRange(apolloData.revenue)
        console.log('Apollo revenue data added:', apolloData.revenue)
      } else {
        enrichedData.revenue = 'Data not verified'
        enrichedData.revenue_range = 'Data not verified'
        console.log('Apollo revenue data not available')
      }
    } catch (error) {
      console.error('Apollo enrichment failed:', error.message)
      // Set fallback values when enrichment fails
      enrichedData.employee_count = 'Data not verified'
      enrichedData.employees_range = 'Data not verified'
      enrichedData.revenue = 'Data not verified'
      enrichedData.revenue_range = 'Data not verified'
    }

    // Step 4: Enrich with industry classification
    if (enrichedData.types && Array.isArray(enrichedData.types)) {
      enrichedData.industry_categories = enrichedData.types
        .filter(type => !['point_of_interest', 'establishment'].includes(type))
        .map(type => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    }

    // Step 5: Add enrichment metadata
    enrichedData.enriched_at = new Date().toISOString()
    if (!enrichedData.enrichment_source) {
      enrichedData.enrichment_source = 'google_places_enhanced'
    }
    enrichedData.is_enriched = true

    // Step 5: Save to database
    console.log('Step 5: Saving to database')
    if (companyId) {
      console.log('Updating existing company with ID:', companyId)
      // Update existing company - filter out fields that might not exist in schema
      const safeUpdateData = filterValidColumns(enrichedData)
      console.log('Filtered data for update:', Object.keys(safeUpdateData))

      const { data, error } = await supabase
        .from('companies')
        .update({
          ...safeUpdateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()
        .single()

      if (error) {
        console.error('Database update error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // If table doesn't exist, provide helpful error message
        if (error.message?.includes('relation "companies" does not exist')) {
          return NextResponse.json(
            { 
              error: 'Companies table not found. Please run the database migration.',
              details: 'Execute the migration: supabase/migrations/005_update_companies_for_enrichment.sql'
            },
            { status: 500 }
          )
        }
        
        // If column doesn't exist, auto-refresh schema cache and retry
        if (error.message?.includes('could not find') && error.message?.includes('column')) {
          console.log('Schema cache issue detected, attempting auto-refresh...')
          
          try {
            // Try to refresh schema cache automatically
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/refresh-schema`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
            
            if (refreshResponse.ok) {
              console.log('Schema cache refreshed, please retry the enrichment')
              return NextResponse.json(
                { 
                  error: 'Schema cache was outdated and has been refreshed. Please try enriching again.',
                  autoRefreshed: true,
                  details: 'PostgREST schema cache was automatically refreshed'
                },
                { status: 202 } // Accepted - retry required
              )
            }
          } catch (refreshError) {
            console.error('Auto-refresh failed:', refreshError)
          }
          
          return NextResponse.json(
            { 
              error: 'Database schema outdated. Schema refresh attempted but may need manual intervention.',
              details: 'If this persists, run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL Editor',
              errorDetails: error.message
            },
            { status: 500 }
          )
        }
        
        throw error
      }
      
      console.log('Database update successful:', data?.name || 'Company')
      return NextResponse.json({
        success: true,
        message: 'Company data enriched successfully',
        data
      })
    } else {
      console.log('Inserting new company:', enrichedData.name)
      // Insert new company - filter out fields that might not exist in schema
      const safeInsertData = filterValidColumns(enrichedData)
      console.log('Filtered data for insert:', Object.keys(safeInsertData))

      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...safeInsertData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Database insert error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // If table doesn't exist, provide helpful error message
        if (error.message?.includes('relation "companies" does not exist')) {
          return NextResponse.json(
            { 
              error: 'Companies table not found. Please run the database migration.',
              details: 'Execute the migration: supabase/migrations/005_update_companies_for_enrichment.sql'
            },
            { status: 500 }
          )
        }
        
        // If column doesn't exist, auto-refresh schema cache and retry
        if (error.message?.includes('could not find') && error.message?.includes('column')) {
          console.log('Schema cache issue detected, attempting auto-refresh...')
          
          try {
            // Try to refresh schema cache automatically
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/refresh-schema`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
            
            if (refreshResponse.ok) {
              console.log('Schema cache refreshed, please retry the enrichment')
              return NextResponse.json(
                { 
                  error: 'Schema cache was outdated and has been refreshed. Please try enriching again.',
                  autoRefreshed: true,
                  details: 'PostgREST schema cache was automatically refreshed'
                },
                { status: 202 } // Accepted - retry required
              )
            }
          } catch (refreshError) {
            console.error('Auto-refresh failed:', refreshError)
          }
          
          return NextResponse.json(
            { 
              error: 'Database schema outdated. Schema refresh attempted but may need manual intervention.',
              details: 'If this persists, run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL Editor',
              errorDetails: error.message
            },
            { status: 500 }
          )
        }
        
        throw error
      }
      
      console.log('Database insert successful:', data?.name || 'Company')
      return NextResponse.json({
        success: true,
        message: 'Company added and enriched successfully',
        data
      })
    }

  } catch (error) {
    console.error('Enrichment process failed:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)

    // Return detailed error information for debugging
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to enrich company data',
        errorType: error.name,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve enriched companies
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const enrichedOnly = searchParams.get('enriched') === 'true'
    
    let query = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (enrichedOnly) {
      query = query.eq('is_enriched', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      companies: data || [],
      total: data?.length || 0
    })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// Helper function to filter out fields that might not exist in the database schema
function filterValidColumns(data) {
  // Define core columns that should always exist (from initial migration)
  const coreColumns = [
    'place_id', 'name', 'phone', 'website', 'rating', 'user_ratings_total'
  ]
  
  // Define enrichment columns that might not exist in older schemas
  const enrichmentColumns = [
    'formatted_address', 'location', 'city', 'state', 'industry',
    'email', 'email_confidence', 'formatted_phone_number', 'international_phone_number',
    'types', 'geometry', 'business_status', 'editorial_summary', 'total_reviews',
    'opening_hours', 'industry_categories', 'is_enriched', 'enriched_at',
    'enrichment_source', 'employees_range', 'revenue_range', 'company_stage',
    'founded_year', 'linkedin_url', 'description', 'owner_name', 'employee_count', 'revenue'
  ]
  
  // Start with core columns and add enrichment columns if they exist in the data
  const filtered = {}
  
  // Always include core columns if present
  coreColumns.forEach(col => {
    if (data.hasOwnProperty(col) && data[col] !== undefined) {
      filtered[col] = data[col]
    }
  })
  
  // Include enrichment columns if present (migration handles missing columns)
  enrichmentColumns.forEach(col => {
    if (data.hasOwnProperty(col) && data[col] !== undefined) {
      filtered[col] = data[col]
    }
  })
  
  return filtered
}

// Advanced enrichment API functions
async function fetchFromHunter(website) {
  const apiKey = process.env.HUNTER_API_KEY
  
  if (!apiKey) {
    console.warn('Hunter API key not found in environment variables')
    return {}
  }

  try {
    // Extract domain from website URL
    const domain = new URL(website).hostname.replace('www.', '')
    
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=1`
    )
    
    if (!response.ok) {
      throw new Error(`Hunter API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data?.emails?.length > 0) {
      const email = data.data.emails[0]
      return {
        owner_email: email.value,
        owner_name: `${email.first_name || ''} ${email.last_name || ''}`.trim() || 'Unknown'
      }
    }
  } catch (error) {
    console.error('Hunter API call failed:', error)
  }

  return {}
}

async function fetchFromApollo(company) {
  const apiKey = process.env.APOLLO_API_KEY
  
  if (!apiKey) {
    console.warn('Apollo API key not found in environment variables')
    return {
      employee_count: 'Data not verified',
      revenue: 'Data not verified',
      employees_range: 'Data not verified',
      revenue_range: 'Data not verified'
    }
  }

  try {
    // TODO: Implement actual Apollo API integration when API key is available
    // Example Apollo API call structure:
    // const response = await fetch('https://api.apollo.io/v1/organizations/search', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Api-Key': apiKey
    //   },
    //   body: JSON.stringify({
    //     name: company.name,
    //     website_url: company.website
    //   })
    // })
    
    console.log('Apollo API integration not yet implemented - returning placeholder data')
    return {
      employee_count: 'Data not verified',
      revenue: 'Data not verified',
      employees_range: 'Data not verified',
      revenue_range: 'Data not verified'
    }
  } catch (error) {
    console.error('Apollo API call failed:', error)
    return {
      employee_count: 'Data not verified',
      revenue: 'Data not verified',
      employees_range: 'Data not verified',
      revenue_range: 'Data not verified'
    }
  }
}

// Helper functions for ranges
function getEmployeeRange(count) {
  if (count <= 10) return '1-10'
  if (count <= 50) return '11-50'
  if (count <= 200) return '51-200'
  if (count <= 1000) return '201-1000'
  return '1000+'
}

function getRevenueRange(revenue) {
  if (revenue <= 100000) return '$0-$100K'
  if (revenue <= 1000000) return '$100K-$1M'
  if (revenue <= 10000000) return '$1M-$10M'
  if (revenue <= 100000000) return '$10M-$100M'
  return '$100M+'
}