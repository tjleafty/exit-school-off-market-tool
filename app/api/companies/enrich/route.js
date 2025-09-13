import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { companyId, companyData } = body

    if (!companyId && !companyData) {
      return NextResponse.json(
        { error: 'Company ID or data is required' },
        { status: 400 }
      )
    }

    // If we have company data from Google Places, enrich it
    let enrichedData = companyData || {}

    // Step 1: Get more details from Google Places if we have a place_id
    if (companyData?.place_id) {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY
      
      if (apiKey) {
        try {
          const detailsParams = new URLSearchParams({
            place_id: companyData.place_id,
            fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,opening_hours,types,price_level,reviews,editorial_summary,current_opening_hours,business_status',
            key: apiKey
          })

          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`
          )

          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            enrichedData = {
              ...enrichedData,
              ...detailsData.result,
              phone: detailsData.result.formatted_phone_number || detailsData.result.international_phone_number,
              business_status: detailsData.result.business_status,
              editorial_summary: detailsData.result.editorial_summary?.overview,
              total_reviews: detailsData.result.user_ratings_total,
              opening_hours: detailsData.result.current_opening_hours?.weekday_text
            }
          }
        } catch (error) {
          console.error('Error fetching place details:', error)
        }
      }
    }

    // Step 2: Extract email from website if available
    if (enrichedData.website && !enrichedData.email) {
      // For now, we'll create a generic contact email
      // In production, you'd want to scrape the website or use an email finder API
      const domain = new URL(enrichedData.website).hostname.replace('www.', '')
      enrichedData.email = `contact@${domain}`
      enrichedData.email_confidence = 'low'
    }

    // Step 3: Enrich with industry classification
    if (enrichedData.types && Array.isArray(enrichedData.types)) {
      enrichedData.industry_categories = enrichedData.types
        .filter(type => !['point_of_interest', 'establishment'].includes(type))
        .map(type => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    }

    // Step 4: Add enrichment metadata
    enrichedData.enriched_at = new Date().toISOString()
    enrichedData.enrichment_source = 'google_places_enhanced'
    enrichedData.is_enriched = true

    // Step 5: Save to database
    if (companyId) {
      // Update existing company - filter out fields that might not exist in schema
      const safeUpdateData = filterValidColumns(enrichedData)
      
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
        console.error('Database error:', error)
        
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
        
        // If column doesn't exist, provide helpful error message
        if (error.message?.includes('could not find') && error.message?.includes('column')) {
          return NextResponse.json(
            { 
              error: 'Database schema outdated. Please run the enrichment migration.',
              details: 'Execute: supabase/migrations/005_update_companies_for_enrichment.sql',
              errorDetails: error.message
            },
            { status: 500 }
          )
        }
        
        throw error
      }
      
      return NextResponse.json({
        success: true,
        message: 'Company data enriched successfully',
        data
      })
    } else {
      // Insert new company - filter out fields that might not exist in schema
      const safeInsertData = filterValidColumns(enrichedData)
      
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
        console.error('Database error:', error)
        
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
        
        // If column doesn't exist, provide helpful error message
        if (error.message?.includes('could not find') && error.message?.includes('column')) {
          return NextResponse.json(
            { 
              error: 'Database schema outdated. Please run the enrichment migration.',
              details: 'Execute: supabase/migrations/005_update_companies_for_enrichment.sql',
              errorDetails: error.message
            },
            { status: 500 }
          )
        }
        
        throw error
      }
      
      return NextResponse.json({
        success: true,
        message: 'Company added and enriched successfully',
        data
      })
    }

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to enrich company data'
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
    'founded_year', 'linkedin_url', 'description'
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