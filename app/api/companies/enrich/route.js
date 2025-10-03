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

    console.log('Step 2: Fetching enrichment from configured sources')

    // Get enrichment source priorities from database
    const { data: sources, error: sourcesError } = await supabase
      .from('enrichment_sources')
      .select('source_name, priority, is_enabled')
      .eq('is_enabled', true)
      .neq('priority', 'DO_NOT_USE')
      .order('priority', { ascending: true })

    if (sourcesError) {
      console.error('Error loading enrichment sources:', sourcesError)
    }

    const activeSources = sources?.map(s => s.source_name) || ['hunter', 'apollo', 'zoominfo']
    console.log('Step 2.1: Active enrichment sources:', activeSources)

    // Call real enrichment APIs for each active source
    const enrichmentData = {
      zoominfo_data: {},
      hunter_data: {},
      apollo_data: {},
      enriched_at: new Date().toISOString()
    }

    // ZoomInfo enrichment
    if (activeSources.includes('zoominfo')) {
      console.log('Step 2.2: Calling ZoomInfo API...')
      try {
        const zoomInfoData = await callZoomInfoAPI(company)
        enrichmentData.zoominfo_data = zoomInfoData
        console.log('✓ ZoomInfo data retrieved')
      } catch (error) {
        console.error('ZoomInfo API error:', error.message)
        enrichmentData.zoominfo_data = { error: error.message }
      }
    }

    // Hunter.io enrichment
    if (activeSources.includes('hunter')) {
      console.log('Step 2.3: Calling Hunter.io API...')
      try {
        const hunterData = await callHunterAPI(company)
        enrichmentData.hunter_data = hunterData
        console.log('✓ Hunter.io data retrieved')
      } catch (error) {
        console.error('Hunter.io API error:', error.message)
        enrichmentData.hunter_data = { error: error.message }
      }
    }

    // Apollo.io enrichment
    if (activeSources.includes('apollo')) {
      console.log('Step 2.4: Calling Apollo.io API...')
      try {
        const apolloData = await callApolloAPI(company)
        enrichmentData.apollo_data = apolloData
        console.log('✓ Apollo.io data retrieved')
      } catch (error) {
        console.error('Apollo.io API error:', error.message)
        enrichmentData.apollo_data = { error: error.message }
      }
    }

    console.log('Step 3: Enrichment data collected from all sources')

    // Update company with enriched status and data
    console.log('Step 3.5: Updating company with ID:', company.id)
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

    console.log('Step 4: Company updated successfully')
    console.log('Step 4.1: Updated company enrichment_data:', JSON.stringify(updatedCompany.enrichment_data))

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

// Helper function to call ZoomInfo API
async function callZoomInfoAPI(company) {
  // Get ZoomInfo API key from database
  const { data: apiKeyData } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('service', 'zoominfo')
    .eq('status', 'Connected')
    .single()

  if (!apiKeyData?.encrypted_key) {
    throw new Error('ZoomInfo API key not configured')
  }

  const apiKey = apiKeyData.encrypted_key

  // Search for company by name and website
  const searchResponse = await fetch('https://api.zoominfo.com/search/company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      companyName: company.name,
      websiteDomain: company.website ? new URL(company.website).hostname : undefined,
      maxResults: 1
    })
  })

  if (!searchResponse.ok) {
    throw new Error(`ZoomInfo API error: ${searchResponse.status}`)
  }

  const searchData = await searchResponse.json()

  if (!searchData?.data || searchData.data.length === 0) {
    return { message: 'No company found in ZoomInfo' }
  }

  const companyData = searchData.data[0]

  // Get contact information
  let contactData = null
  if (companyData.id) {
    const contactResponse = await fetch('https://api.zoominfo.com/search/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        companyId: companyData.id,
        managementLevel: ['Owner', 'C-Level', 'VP'],
        maxResults: 1
      })
    })

    if (contactResponse.ok) {
      const contactJson = await contactResponse.json()
      contactData = contactJson?.data?.[0] || null
    }
  }

  return {
    company: companyData,
    contact: contactData,
    source: 'zoominfo'
  }
}

// Helper function to call Hunter.io API
async function callHunterAPI(company) {
  if (!company.website) {
    return { message: 'No website available for Hunter.io lookup' }
  }

  // Get Hunter.io API key from database
  const { data: apiKeyData } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('service', 'hunter')
    .eq('status', 'Connected')
    .single()

  if (!apiKeyData?.encrypted_key) {
    throw new Error('Hunter.io API key not configured')
  }

  const apiKey = apiKeyData.encrypted_key
  const domain = company.website.replace('http://', '').replace('https://', '').split('/')[0]

  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=10`
  )

  if (!response.ok) {
    throw new Error(`Hunter.io API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    emails: data.data?.emails || [],
    domain: data.data?.domain || domain,
    organization: data.data?.organization || null,
    source: 'hunter'
  }
}

// Helper function to call Apollo.io API
async function callApolloAPI(company) {
  // Get Apollo.io API key from database
  const { data: apiKeyData } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('service', 'apollo')
    .eq('status', 'Connected')
    .single()

  if (!apiKeyData?.encrypted_key) {
    throw new Error('Apollo.io API key not configured')
  }

  const apiKey = apiKeyData.encrypted_key

  // Search for organization
  const response = await fetch('https://api.apollo.io/v1/organizations/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      q_organization_name: company.name,
      page: 1,
      per_page: 1
    })
  })

  if (!response.ok) {
    throw new Error(`Apollo.io API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    organizations: data.organizations || [],
    source: 'apollo'
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