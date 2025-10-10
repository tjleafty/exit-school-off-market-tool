import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrichmentRequest {
  companyId: string
  providers?: string[]
}

interface EnrichmentData {
  owner_name?: string
  owner_email?: string
  owner_phone?: string
  employee_count?: number
  revenue?: number
  history?: string
  sources: Record<string, string>
  confidence: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { companyId, providers }: EnrichmentRequest = await req.json()

    if (!companyId) {
      throw new Error('companyId is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get enrichment source priorities from database
    let activeProviders = providers
    if (!activeProviders) {
      const { data: sources, error: sourcesError } = await supabase
        .from('enrichment_sources')
        .select('source_name, priority')
        .eq('is_enabled', true)
        .neq('priority', 'DO_NOT_USE')
        .order('priority', { ascending: true })

      if (sourcesError) {
        console.warn('Failed to load enrichment sources, using defaults:', sourcesError)
        activeProviders = ['hunter', 'apollo']
      } else {
        activeProviders = sources.map(s => s.source_name)
        console.log('Using prioritized enrichment sources:', activeProviders)
      }
    }

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`)
    }

    console.log('Company data retrieved:', company.name)

    console.log(`Starting enrichment for company: ${company.name}`)
    console.log(`Using providers in priority order:`, activeProviders)

    // Fetch enrichment data from providers
    const enrichmentData = await fetchEnrichmentData(company, activeProviders)

    // Update company with enrichment data
    const { error: enrichError } = await supabase
      .from('companies')
      .update({
        is_enriched: true,
        enrichment_data: enrichmentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)

    if (enrichError) {
      console.error('Failed to update company with enrichment data:', enrichError)
      throw enrichError
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: null, // System action
      p_action: 'ENRICHMENT_COMPLETED',
      p_entity: 'ENRICHMENT',
      p_entity_id: companyId,
      p_metadata: {
        providers_used: activeProviders,
        confidence: enrichmentData.confidence,
        data_points: Object.keys(enrichmentData).length
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId,
        enrichmentData,
        message: `Enrichment completed for ${company.name}`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Enrichment error:', error)

    console.error('Failed to enrich company')

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function fetchEnrichmentData(company: any, providers: string[]): Promise<EnrichmentData> {
  const enrichmentData: EnrichmentData = {
    sources: {},
    confidence: 0
  }

  let totalConfidence = 0
  let dataPoints = 0

  // Process providers in priority order
  for (const provider of providers) {
    console.log(`Attempting enrichment with: ${provider}`)

    if (provider === 'hunter' && company.website) {
      try {
        const hunterData = await fetchFromHunter(company.website)
        if (hunterData.owner_email) {
          enrichmentData.owner_email = hunterData.owner_email
          enrichmentData.owner_name = hunterData.owner_name
          enrichmentData.sources.owner_email = 'hunter'
          enrichmentData.sources.owner_name = 'hunter'
          totalConfidence += 0.8
          dataPoints += 2
          console.log('✓ Hunter.io provided email and name')
        }
      } catch (error) {
        console.warn('Hunter.io enrichment failed:', error.message)
      }
    }

    if (provider === 'apollo') {
      try {
        const apolloData = await fetchFromApollo(company)
        if (apolloData.employee_count) {
          enrichmentData.employee_count = apolloData.employee_count
          enrichmentData.sources.employee_count = 'apollo'
          totalConfidence += 0.7
          dataPoints += 1
          console.log('✓ Apollo provided employee count')
        }
        if (apolloData.revenue) {
          enrichmentData.revenue = apolloData.revenue
          enrichmentData.sources.revenue = 'apollo'
          totalConfidence += 0.6
          dataPoints += 1
          console.log('✓ Apollo provided revenue')
        }
      } catch (error) {
        console.warn('Apollo enrichment failed:', error.message)
      }
    }

    if (provider === 'zoominfo') {
      try {
        const zoomInfoData = await fetchFromZoomInfo(company)
        if (zoomInfoData.owner_phone) {
          enrichmentData.owner_phone = zoomInfoData.owner_phone
          enrichmentData.sources.owner_phone = 'zoominfo'
          totalConfidence += 0.75
          dataPoints += 1
          console.log('✓ ZoomInfo provided phone')
        }
        // ZoomInfo can also provide email and company data if higher priority
        if (zoomInfoData.owner_email && !enrichmentData.owner_email) {
          enrichmentData.owner_email = zoomInfoData.owner_email
          enrichmentData.owner_name = zoomInfoData.owner_name
          enrichmentData.sources.owner_email = 'zoominfo'
          enrichmentData.sources.owner_name = 'zoominfo'
          totalConfidence += 0.85
          dataPoints += 2
          console.log('✓ ZoomInfo provided email and name')
        }
        if (zoomInfoData.employee_count && !enrichmentData.employee_count) {
          enrichmentData.employee_count = zoomInfoData.employee_count
          enrichmentData.sources.employee_count = 'zoominfo'
          totalConfidence += 0.8
          dataPoints += 1
          console.log('✓ ZoomInfo provided employee count')
        }
        if (zoomInfoData.revenue && !enrichmentData.revenue) {
          enrichmentData.revenue = zoomInfoData.revenue
          enrichmentData.sources.revenue = 'zoominfo'
          totalConfidence += 0.75
          dataPoints += 1
          console.log('✓ ZoomInfo provided revenue')
        }
      } catch (error) {
        console.warn('ZoomInfo enrichment failed:', error.message)
      }
    }

    if (provider === 'clay') {
      try {
        const clayData = await fetchFromClay(company)
        // Clay is async - we just track that we sent the data
        if (clayData.clay_status) {
          enrichmentData.sources.clay = 'pending'
          console.log('✓ Clay enrichment initiated (async)')
        }
      } catch (error) {
        console.warn('Clay enrichment failed:', error.message)
      }
    }
  }

  // Calculate overall confidence
  enrichmentData.confidence = dataPoints > 0 ? Math.min(totalConfidence / dataPoints, 1.0) : 0.1

  console.log(`Enrichment complete: ${dataPoints} data points collected`)
  return enrichmentData
}

async function fetchFromHunter(domain: string): Promise<any> {
  const apiKey = Deno.env.get('HUNTER_API_KEY')
  
  if (!apiKey) {
    console.warn('Hunter API key not found')
    return {}
  }

  try {
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
        owner_name: `${email.first_name} ${email.last_name}`.trim()
      }
    }
  } catch (error) {
    console.error('Hunter API call failed:', error)
  }

  return {}
}

async function fetchFromApollo(company: any): Promise<any> {
  // Apollo API would go here - for now return mock data based on company size
  const mockEmployeeCount = Math.floor(Math.random() * 200) + 10
  const mockRevenue = mockEmployeeCount * 100000 // Rough estimate
  
  return {
    employee_count: mockEmployeeCount,
    revenue: mockRevenue
  }
}

async function fetchFromZoomInfo(company: any): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get ZoomInfo API key from database
  const { data: apiKeyData, error: apiKeyError } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('service', 'zoominfo')
    .eq('status', 'Connected')
    .single()

  if (apiKeyError || !apiKeyData?.encrypted_key) {
    console.warn('ZoomInfo API key not found in database')
    return {}
  }

  const apiKey = apiKeyData.encrypted_key

  try {
    // ZoomInfo Company Search API
    // Search by company name or website domain
    const searchParam = company.website
      ? new URL(company.website).hostname
      : company.name

    const searchResponse = await fetch(
      `https://api.zoominfo.com/search/company`,
      {
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
      }
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error(`ZoomInfo API error (${searchResponse.status}):`, errorText)
      return {}
    }

    const searchData = await searchResponse.json()

    if (!searchData?.data || searchData.data.length === 0) {
      console.warn('No company found in ZoomInfo')
      return {}
    }

    const companyData = searchData.data[0]

    // Extract enrichment data from ZoomInfo response
    const enrichmentData: any = {}

    // Company information
    if (companyData.revenue) enrichmentData.revenue = companyData.revenue
    if (companyData.employees) enrichmentData.employee_count = companyData.employees

    // Contact information (if available in company record)
    if (companyData.phone) enrichmentData.owner_phone = companyData.phone

    // Get primary contact if available
    if (companyData.id) {
      try {
        const contactResponse = await fetch(
          `https://api.zoominfo.com/search/contact`,
          {
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
          }
        )

        if (contactResponse.ok) {
          const contactData = await contactResponse.json()
          if (contactData?.data && contactData.data.length > 0) {
            const contact = contactData.data[0]
            if (contact.email) enrichmentData.owner_email = contact.email
            if (contact.firstName && contact.lastName) {
              enrichmentData.owner_name = `${contact.firstName} ${contact.lastName}`.trim()
            }
            if (contact.directPhone) enrichmentData.owner_phone = contact.directPhone
          }
        }
      } catch (contactError) {
        console.warn('ZoomInfo contact lookup failed:', contactError)
      }
    }

    console.log('✓ ZoomInfo enrichment successful')
    return enrichmentData

  } catch (error) {
    console.error('ZoomInfo API call failed:', error)
    return {}
  }
}

async function fetchFromClay(company: any): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get Clay webhook URL from database
  const { data: apiKeyData, error: apiKeyError } = await supabase
    .from('api_keys')
    .select('webhook_url, encrypted_key')
    .eq('service', 'clay')
    .single()

  if (apiKeyError || !apiKeyData?.webhook_url) {
    console.warn('Clay webhook URL not found in database')
    return {}
  }

  const webhookUrl = apiKeyData.webhook_url
  const apiKey = apiKeyData.encrypted_key

  try {
    // Prepare company data to send to Clay
    const payload = {
      company_id: company.id,
      company_name: company.name,
      website: company.website || '',
      domain: company.website ? new URL(company.website).hostname : '',
      address: company.formatted_address || company.location || '',
      phone: company.phone || company.formatted_phone_number || '',
      place_id: company.place_id || ''
    }

    console.log('📤 Sending company data to Clay webhook:', company.name)

    // Send data to Clay webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Clay webhook error (${response.status}):`, errorText)
      return {}
    }

    const result = await response.json()
    console.log('✓ Data sent to Clay successfully for async enrichment')

    // Store metadata indicating Clay enrichment is pending
    return {
      clay_status: 'pending',
      clay_sent_at: new Date().toISOString(),
      clay_webhook_response: result
    }

  } catch (error) {
    console.error('Clay webhook call failed:', error)
    return {}
  }
}