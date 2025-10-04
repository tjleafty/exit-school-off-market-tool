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
        console.log('✓ ZoomInfo data retrieved:', JSON.stringify(zoomInfoData, null, 2))
      } catch (error) {
        console.error('ZoomInfo API error:', error.message)
        console.error('ZoomInfo error stack:', error.stack)
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
  console.log('callZoomInfoAPI: Starting for company:', company.name)

  // Get ZoomInfo credentials from database (username, client_id, private_key)
  const { data: apiKeyData, error: keyError } = await supabase
    .from('api_keys')
    .select('username, client_id, encrypted_key')
    .eq('service', 'zoominfo')
    .eq('status', 'Connected')
    .single()

  console.log('ZoomInfo credentials lookup result:', {
    hasUsername: !!apiKeyData?.username,
    hasClientId: !!apiKeyData?.client_id,
    hasPrivateKey: !!apiKeyData?.encrypted_key,
    error: keyError
  })

  if (!apiKeyData?.username || !apiKeyData?.client_id || !apiKeyData?.encrypted_key) {
    throw new Error('ZoomInfo credentials not fully configured (requires username, client_id, and private_key)')
  }

  const { username, client_id, encrypted_key: privateKey } = apiKeyData
  console.log('Using ZoomInfo JWT auth for user:', username, 'with client_id:', client_id)

  // Generate JWT token using ZoomInfo's PKI authentication
  const authClient = require('zoominfo-api-auth-client')
  let accessToken

  console.log('Requesting JWT token from ZoomInfo...')
  const tokenResult = await authClient.getAccessTokenViaPKI(username, client_id, privateKey)

  // Check if the result is an error object (library returns error instead of throwing)
  if (tokenResult && tokenResult.isAxiosError) {
    const errorMsg = tokenResult.response?.data?.message || tokenResult.message || 'Authentication failed'
    console.error('ZoomInfo JWT authentication failed:', errorMsg)
    throw new Error(`ZoomInfo JWT authentication failed: ${errorMsg}`)
  }

  // Success - tokenResult should be the JWT string
  accessToken = tokenResult
  console.log('JWT token obtained successfully')

  // Try multiple search strategies to find the company
  let searchData = null
  let parsedHostname = null

  // Parse website if available
  if (company.website) {
    try {
      parsedHostname = new URL(company.website).hostname
      console.log('Parsed website from', company.website, 'to', parsedHostname)
    } catch (e) {
      console.log('Could not parse website URL:', company.website)
    }
  }

  // Strategy 1: Search by website only (most accurate)
  if (parsedHostname) {
    const websiteOnlyRequest = { companyWebsite: parsedHostname }
    console.log('ZoomInfo search strategy 1 (website only):', JSON.stringify(websiteOnlyRequest))

    const websiteResponse = await fetch('https://api.zoominfo.com/search/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(websiteOnlyRequest)
    })

    console.log('Strategy 1 response status:', websiteResponse.status)

    if (websiteResponse.ok) {
      searchData = await websiteResponse.json()
      console.log('Strategy 1 results:', searchData?.data?.length || 0, 'companies found')
    }
  }

  // Strategy 2: Search by name only if website search didn't work
  if (!searchData?.data || searchData.data.length === 0) {
    const nameOnlyRequest = { companyName: company.name }
    console.log('ZoomInfo search strategy 2 (name only):', JSON.stringify(nameOnlyRequest))

    const nameResponse = await fetch('https://api.zoominfo.com/search/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(nameOnlyRequest)
    })

    console.log('Strategy 2 response status:', nameResponse.status)

    if (!nameResponse.ok) {
      const errorText = await nameResponse.text()
      console.error('ZoomInfo API error response:', errorText)
      throw new Error(`ZoomInfo API error: ${nameResponse.status} - ${errorText}`)
    }

    searchData = await nameResponse.json()
    console.log('Strategy 2 results:', searchData?.data?.length || 0, 'companies found')
  }

  console.log('Final ZoomInfo company search data:', JSON.stringify(searchData, null, 2))

  if (!searchData?.data || searchData.data.length === 0) {
    console.log('No company found in ZoomInfo for:', company.name)
    return { message: 'No company found in ZoomInfo' }
  }

  const companySearchResult = searchData.data[0]
  console.log('Found company in ZoomInfo search:', companySearchResult.id, companySearchResult.name)

  // Step 2: Use the Enrich endpoint to get full company details
  console.log('Enriching company with ID:', companySearchResult.id)

  // Request all available company fields
  const enrichResponse = await fetch('https://api.zoominfo.com/enrich/company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      matchCompanyInput: [{
        companyId: companySearchResult.id
      }],
      outputFields: [
        'id', 'name', 'website', 'phone', 'revenue', 'revenueRange',
        'employees', 'employeesRange', 'industry', 'subIndustry',
        'sicCodes', 'naicsCodes', 'primarySicCode', 'primaryNaicsCode',
        'street', 'city', 'state', 'zipCode', 'country',
        'description', 'founded', 'ticker', 'exchange',
        'facebookUrl', 'twitterUrl', 'linkedInUrl',
        'technologies', 'keywords', 'emailDomain'
      ]
    })
  })

  console.log('ZoomInfo enrich response status:', enrichResponse.status)

  if (!enrichResponse.ok) {
    const errorText = await enrichResponse.text()
    console.error('ZoomInfo enrich API error:', errorText)
    // Fall back to search results if enrich fails
    console.log('Falling back to search results')
  }

  let enrichedCompanyData = companySearchResult
  if (enrichResponse.ok) {
    const enrichData = await enrichResponse.json()
    console.log('ZoomInfo enriched company data received:', JSON.stringify(enrichData, null, 2))

    // The enrich endpoint returns data in outputCompanies array
    if (enrichData?.data?.outputCompanies && enrichData.data.outputCompanies.length > 0) {
      enrichedCompanyData = enrichData.data.outputCompanies[0]
      console.log('Using enriched company data with', Object.keys(enrichedCompanyData).length, 'fields')
    }
  }

  // Get contact information
  let contactData = null
  if (companySearchResult.id) {
    console.log('Fetching contact for company ID:', companySearchResult.id)
    const contactResponse = await fetch('https://api.zoominfo.com/search/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        companyId: companySearchResult.id,
        managementLevel: ['Owner', 'C-Level', 'VP']
      })
    })

    console.log('ZoomInfo contact search response status:', contactResponse.status)

    if (contactResponse.ok) {
      const contactJson = await contactResponse.json()
      console.log('ZoomInfo contact data:', JSON.stringify(contactJson, null, 2))
      contactData = contactJson?.data?.[0] || null
    } else {
      const errorText = await contactResponse.text()
      console.error('ZoomInfo contact API error:', errorText)
    }
  }

  const result = {
    company: enrichedCompanyData,
    contact: contactData,
    source: 'zoominfo'
  }

  console.log('Returning ZoomInfo data with fields:', Object.keys(enrichedCompanyData))
  return result
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