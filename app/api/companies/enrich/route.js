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
      // Update existing company
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...enrichedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()
        .single()

      if (error) throw error
      
      return NextResponse.json({
        success: true,
        message: 'Company data enriched successfully',
        data
      })
    } else {
      // Insert new company
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...enrichedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      
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