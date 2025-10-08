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

    // Step 5: Save contacts to company_contacts table
    console.log('Step 5: Saving contacts to database')
    const contactsSaved = await saveContactsToDatabase(company.id, enrichmentData)
    console.log('Step 5.1: Saved', contactsSaved, 'contacts to database')

    return NextResponse.json({
      success: true,
      message: 'Company enriched successfully',
      data: updatedCompany,
      enrichmentData: enrichmentData,
      contactsSaved: contactsSaved,
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

  // Request only the basic fields available in your ZoomInfo license
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
        // Basic Company Info (API allowed only)
        'id', 'name', 'website', 'phone', 'fax', 'ticker', 'foundedYear',

        // Financial
        'revenue', 'revenueRange',

        // Firmographics (limited by API license)
        'businessModel', 'certificationDate',

        // Industry (only fields API allows)
        'sicCodes', 'naicsCodes', 'primaryIndustry',

        // Location
        'street', 'city', 'state', 'zipCode', 'country',

        // Web
        'alexaRank'
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

    // The enrich endpoint returns data in result[0].data[0] structure
    if (enrichData?.data?.result && enrichData.data.result.length > 0 && enrichData.data.result[0].data && enrichData.data.result[0].data.length > 0) {
      enrichedCompanyData = enrichData.data.result[0].data[0]
      console.log('Using enriched company data with', Object.keys(enrichedCompanyData).length, 'fields')
    }
  }

  // Get contact information (top 10 contacts)
  let contactData = []
  if (companySearchResult.id) {
    console.log('Fetching contacts for company ID:', companySearchResult.id)

    // Try executive search first
    let contactResponse = await fetch('https://api.zoominfo.com/search/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        companyId: companySearchResult.id.toString(),
        managementLevel: 'C Level Exec,VP Level Exec,Director,Manager',
        page: 1,
        rpp: 10
      })
    })

    console.log('ZoomInfo executive search response status:', contactResponse.status)

    let foundContacts = []
    if (contactResponse.ok) {
      const contactJson = await contactResponse.json()
      foundContacts = contactJson?.data || []
      console.log('ZoomInfo executive search found', foundContacts.length, 'contacts')

      // If no executives found, try broader search (any contact)
      if (foundContacts.length === 0) {
        console.log('No executives found, trying broader search for ANY contacts...')
        contactResponse = await fetch('https://api.zoominfo.com/search/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            companyId: companySearchResult.id.toString(),
            // No managementLevel filter = search all contacts
            page: 1,
            rpp: 10
          })
        })

        console.log('ZoomInfo broad search response status:', contactResponse.status)

        if (contactResponse.ok) {
          const broadContactJson = await contactResponse.json()
          foundContacts = broadContactJson?.data || []
          console.log('ZoomInfo broad search found', foundContacts.length, 'contacts')
        } else {
          console.error('Broad contact search failed:', contactResponse.status)
        }
      }
    } else {
      console.error('Executive search failed:', contactResponse.status)
    }

    if (foundContacts.length > 0) {
      console.log('Proceeding with', foundContacts.length, 'contacts for enrichment')

      // Enrich each contact to get email and phone
      for (const contact of foundContacts.slice(0, 10)) {
        try {
          console.log('Enriching contact:', contact.firstName, contact.lastName, 'at', company.name)
          const enrichResponse = await fetch('https://api.zoominfo.com/enrich/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              matchPersonInput: [{
                firstName: contact.firstName,
                lastName: contact.lastName,
                companyName: company.name
              }],
              outputFields: [
                'id', 'firstName', 'lastName', 'middleName',
                'email', 'phone', 'directPhone', 'mobilePhone',
                'jobTitle', 'managementLevel', 'jobFunction', 'department',
                'companyId', 'companyName', 'linkedinUrl',
                'contactAccuracyScore', 'lastUpdatedDate'
              ]
            })
          })

          if (enrichResponse.ok) {
            const enrichData = await enrichResponse.json()
            console.log('Contact enrichment response received for', contact.firstName, contact.lastName)
            console.log('Response status: SUCCESS')

            // Debug: Log the full response structure
            console.log('=== ENRICHMENT RESPONSE DEBUG ===')
            console.log('Response keys:', Object.keys(enrichData))
            console.log('enrichData.data exists?', !!enrichData?.data)
            console.log('enrichData.data.result exists?', !!enrichData?.data?.result)
            console.log('enrichData.data.result is array?', Array.isArray(enrichData?.data?.result))
            if (enrichData?.data?.result) {
              console.log('enrichData.data.result length:', enrichData.data.result.length)
              if (enrichData.data.result[0]) {
                console.log('enrichData.data.result[0] keys:', Object.keys(enrichData.data.result[0]))
                console.log('enrichData.data.result[0].data exists?', !!enrichData.data.result[0].data)
                if (enrichData.data.result[0].data) {
                  console.log('enrichData.data.result[0].data is array?', Array.isArray(enrichData.data.result[0].data))
                  console.log('enrichData.data.result[0].data length:', enrichData.data.result[0].data.length)
                }
              }
            }
            console.log('Full response JSON (first 1000 chars):', JSON.stringify(enrichData).substring(0, 1000))
            console.log('=== END DEBUG ===')

            // Extract enriched contact from response
            if (enrichData?.data?.result?.[0]?.data?.[0]) {
              const enrichedContact = enrichData.data.result[0].data[0]
              console.log('✓✓✓ Successfully extracted enriched contact')
              console.log('  Email:', enrichedContact.email || 'NOT PROVIDED')
              console.log('  Direct Phone:', enrichedContact.directPhone || 'NOT PROVIDED')
              console.log('  Mobile Phone:', enrichedContact.mobilePhone || 'NOT PROVIDED')
              console.log('  Contact Accuracy Score:', enrichedContact.contactAccuracyScore)
              contactData.push(enrichedContact)
            } else {
              // Fallback to basic contact info if enrichment response is empty
              console.log('⚠⚠⚠ Could not extract enriched contact from response structure')
              console.log('  Using basic contact info from search instead')
              console.log('  Basic contact has email?:', !!contact.email)
              console.log('  Basic contact has phone?:', !!contact.directPhone)
              contactData.push(contact)
            }
          } else {
            const errorText = await enrichResponse.text()
            console.error('❌ Contact enrichment FAILED:', enrichResponse.status)
            console.error('Error response:', errorText)
            // Use basic contact info on error
            contactData.push(contact)
          }
        } catch (error) {
          console.error('Contact enrichment exception:', error.message)
          // Use basic contact info on exception
          contactData.push(contact)
        }
      }

      console.log('Final contact count with enrichment:', contactData.length)
    } else {
      console.log('⚠ No contacts found for this company in ZoomInfo')
    }
  }

  const result = {
    company: enrichedCompanyData,
    contacts: contactData,
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
  console.log('callApolloAPI: Starting for company:', company.name)

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
  console.log('Apollo: Searching for organization:', company.name)
  const orgResponse = await fetch('https://api.apollo.io/v1/organizations/search', {
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

  console.log('Apollo organization search response status:', orgResponse.status)

  if (!orgResponse.ok) {
    const errorText = await orgResponse.text()
    console.error('Apollo organization search FAILED:', errorText)
    throw new Error(`Apollo.io organization search error: ${orgResponse.status}`)
  }

  const orgData = await orgResponse.json()
  const organizations = orgData.organizations || []

  console.log('Apollo: Found', organizations.length, 'organizations')

  if (organizations.length > 0) {
    const org = organizations[0]
    console.log('Apollo: First organization match:')
    console.log('  Name:', org.name)
    console.log('  ID:', org.id)
    console.log('  Website:', org.website_url)
    console.log('  Employees:', org.estimated_num_employees)
  } else {
    console.log('Apollo: No organizations found for query:', company.name)
    console.log('Apollo: Response data keys:', Object.keys(orgData))
  }

  // Get people/contacts for the organization
  let people = []
  if (organizations.length > 0 && organizations[0].id) {
    const orgId = organizations[0].id
    console.log('Apollo: Searching for people at organization ID:', orgId)

    try {
      const peopleResponse = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify({
          organization_ids: [orgId],
          person_seniorities: ['senior', 'manager', 'director', 'vp', 'c_suite', 'owner'],
          page: 1,
          per_page: 10
        })
      })

      if (peopleResponse.ok) {
        const peopleData = await peopleResponse.json()
        people = peopleData.people || []
        console.log('Apollo: Found', people.length, 'people')

        if (people.length > 0) {
          console.log('Apollo: First person details:')
          const person = people[0]
          console.log('  Name:', person.first_name, person.last_name)
          console.log('  Title:', person.title)
          console.log('  Email:', person.email || 'NOT PROVIDED')
          console.log('  Seniority:', person.seniority)
        } else {
          console.log('Apollo: No people found. Response keys:', Object.keys(peopleData))
          console.log('Apollo: Response data (first 500 chars):', JSON.stringify(peopleData).substring(0, 500))
        }
      } else {
        const errorText = await peopleResponse.text()
        console.error('Apollo people search error:', peopleResponse.status, errorText)
      }
    } catch (error) {
      console.error('Apollo people search failed:', error.message)
    }
  }

  return {
    organizations: organizations,
    people: people,
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

// Helper function to save contacts to company_contacts table
async function saveContactsToDatabase(companyId, enrichmentData) {
  let totalSaved = 0

  try {
    // Process ZoomInfo contacts
    const zoomContacts = enrichmentData.zoominfo_data?.contacts || []
    for (const contact of zoomContacts) {
      const contactRecord = {
        company_id: companyId,
        source: 'zoominfo',
        source_contact_id: contact.id?.toString(),
        first_name: contact.firstName,
        last_name: contact.lastName,
        middle_name: contact.middleName,
        job_title: contact.jobTitle,
        management_level: contact.managementLevel,
        department: contact.department,
        job_function: contact.jobFunction,
        job_start_date: contact.jobStartDate,
        email: contact.email,
        phone: contact.phone,
        direct_phone: contact.directPhone,
        mobile_phone: contact.mobilePhone,
        linkedin_url: contact.linkedinUrl,
        confidence_score: null,
        contact_accuracy_score: contact.contactAccuracyScore,
        has_email: contact.hasEmail || !!contact.email,
        has_direct_phone: contact.hasDirectPhone || !!contact.directPhone,
        has_mobile_phone: contact.hasMobilePhone || !!contact.mobilePhone,
        email_verified: false,
        last_enriched_at: new Date().toISOString(),
        last_updated_date: contact.lastUpdatedDate,
        valid_date: contact.validDate,
        raw_data: contact
      }

      const { error } = await supabase
        .from('company_contacts')
        .upsert(contactRecord, {
          onConflict: 'company_id,source,source_contact_id',
          ignoreDuplicates: false
        })

      if (!error) totalSaved++
      else console.error('Error saving ZoomInfo contact:', error)
    }

    // Process Apollo people
    const apolloPeople = enrichmentData.apollo_data?.people || []
    for (const person of apolloPeople) {
      const contactRecord = {
        company_id: companyId,
        source: 'apollo',
        source_contact_id: person.id?.toString(),
        first_name: person.first_name,
        last_name: person.last_name,
        job_title: person.title,
        seniority: person.seniority,
        department: person.departments?.[0],
        email: person.email,
        phone: person.phone_numbers?.[0]?.sanitized_number || person.phone_numbers?.[0]?.raw_number,
        linkedin_url: person.linkedin_url,
        twitter_url: person.twitter_url,
        has_email: !!person.email,
        has_direct_phone: false,
        has_mobile_phone: false,
        email_verified: false,
        last_enriched_at: new Date().toISOString(),
        raw_data: person
      }

      const { error } = await supabase
        .from('company_contacts')
        .upsert(contactRecord, {
          onConflict: 'company_id,source,source_contact_id',
          ignoreDuplicates: false
        })

      if (!error) totalSaved++
      else console.error('Error saving Apollo contact:', error)
    }

    // Process Hunter emails
    const hunterEmails = enrichmentData.hunter_data?.emails || []
    for (const email of hunterEmails) {
      // Skip generic emails
      if (email.type === 'generic') continue

      const contactRecord = {
        company_id: companyId,
        source: 'hunter',
        source_contact_id: null, // Hunter doesn't provide contact IDs
        first_name: email.first_name,
        last_name: email.last_name,
        job_title: email.position,
        seniority: email.seniority,
        department: email.department,
        email: email.value,
        phone: email.phone_number,
        linkedin_url: email.linkedin,
        twitter_url: email.twitter,
        confidence_score: email.confidence,
        has_email: true,
        has_direct_phone: !!email.phone_number,
        has_mobile_phone: false,
        email_verified: email.verification?.status === 'valid',
        last_enriched_at: new Date().toISOString(),
        raw_data: email
      }

      const { error } = await supabase
        .from('company_contacts')
        .upsert(contactRecord, {
          onConflict: 'company_id,source,email',
          ignoreDuplicates: false
        })

      if (!error) totalSaved++
      else console.error('Error saving Hunter contact:', error)
    }

    console.log('Successfully saved', totalSaved, 'contacts to database')
    return totalSaved

  } catch (error) {
    console.error('Error in saveContactsToDatabase:', error)
    return totalSaved
  }
}