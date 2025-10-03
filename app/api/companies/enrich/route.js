import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  console.log('Enrichment API called at:', new Date().toISOString())

  try {
    console.log('Step 0: Parsing request body...')
    const body = await request.json()
    console.log('Step 0 complete: Request body received')

    const { companyId, companyData, tier = 'BASIC' } = body

    if (!companyId && !companyData) {
      console.error('Missing required parameters:', { companyId, companyData })
      return NextResponse.json(
        { error: 'Company ID or data is required', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    console.log('Step 1: Processing enrichment for:', companyId ? `ID: ${companyId}` : `Data: ${companyData?.name}`)

    // Get or create company record
    let company
    if (companyId) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) throw error
      company = data
    } else {
      // Save company data first if it's new
      const { data, error } = await supabase
        .from('companies')
        .upsert([{
          place_id: companyData.place_id || `temp_${Date.now()}`,
          name: companyData.name,
          formatted_address: companyData.formatted_address || companyData.address,
          location: companyData.location || companyData.formatted_address,
          city: companyData.city,
          state: companyData.state,
          phone: companyData.phone,
          website: companyData.website,
          rating: companyData.rating,
          user_ratings_total: companyData.user_ratings_total,
          is_enriched: false
        }], {
          onConflict: 'place_id'
        })
        .select()
        .single()

      if (error) throw error
      company = data
    }

    console.log('Step 2: Enriching company with ZoomInfo:', company.name)

    // For now, create mock enrichment data
    // TODO: Integrate real ZoomInfo API when trial credentials are confirmed
    const enrichmentData = {
      sources: { zoominfo: 'mock' },
      confidence: 0.5,
      owner_email: company.website ? `contact@${company.website.replace('http://', '').replace('https://', '').split('/')[0]}` : null,
      owner_name: 'Business Owner',
      owner_phone: company.phone || null,
      employee_count: Math.floor(Math.random() * 200) + 10,
      revenue: Math.floor(Math.random() * 5000000) + 100000,
      enriched_at: new Date().toISOString()
    }

    console.log('Step 3: Enrichment data generated:', Object.keys(enrichmentData).length, 'fields')

    // Update company with enriched status and data
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        is_enriched: true,
        enrichment_data: enrichmentData
      })
      .eq('id', company.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update company:', updateError)
      throw updateError
    }

    console.log('Step 4: Company updated successfully with enrichment data')

    return NextResponse.json({
      success: true,
      message: 'Company enriched successfully',
      data: updatedCompany,
      enrichmentData: enrichmentData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Enrichment process failed:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)

    // Check if this is a JSON parsing error
    if (error.message && error.message.includes('JSON')) {
      console.error('JSON parsing error - request body might be malformed')
      return NextResponse.json(
        {
          error: 'Invalid request format - JSON parsing failed',
          errorType: 'JSONParseError',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Return detailed error information for debugging
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to enrich company data',
        errorType: error.name || 'UnknownError',
        timestamp: new Date().toISOString(),
        errorDetails: error.stack
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