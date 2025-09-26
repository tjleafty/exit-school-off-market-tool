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
    const { companyId, providers = ['hunter', 'apollo'] }: EnrichmentRequest = await req.json()
    
    if (!companyId) {
      throw new Error('companyId is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`)
    }

    // Update enrichment status to RUNNING
    const { error: updateError } = await supabase
      .from('enrichments')
      .update({ 
        status: 'RUNNING',
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Failed to update enrichment status:', updateError)
    }

    console.log(`Starting enrichment for company: ${company.name}`)

    // Fetch enrichment data from providers
    const enrichmentData = await fetchEnrichmentData(company, providers)

    // Update enrichment with results
    const { error: enrichError } = await supabase
      .from('enrichments')
      .update({
        status: 'COMPLETED',
        ...enrichmentData,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)

    if (enrichError) {
      throw enrichError
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: null, // System action
      p_action: 'ENRICHMENT_COMPLETED',
      p_entity: 'ENRICHMENT',
      p_entity_id: companyId,
      p_metadata: {
        providers_used: providers,
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

    // Try to update enrichment status to FAILED
    try {
      const { companyId } = await req.json()
      if (companyId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        
        await supabase
          .from('enrichments')
          .update({ 
            status: 'FAILED',
            updated_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
      }
    } catch (updateError) {
      console.error('Failed to update enrichment status to FAILED:', updateError)
    }

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

  // Hunter.io - Email finding
  if (providers.includes('hunter') && company.website) {
    try {
      const hunterData = await fetchFromHunter(company.website)
      if (hunterData.owner_email) {
        enrichmentData.owner_email = hunterData.owner_email
        enrichmentData.owner_name = hunterData.owner_name
        enrichmentData.sources.owner_email = 'hunter'
        enrichmentData.sources.owner_name = 'hunter'
        totalConfidence += 0.8
        dataPoints += 2
      }
    } catch (error) {
      console.warn('Hunter.io enrichment failed:', error.message)
    }
  }

  // Apollo - Contact and company data
  if (providers.includes('apollo')) {
    try {
      const apolloData = await fetchFromApollo(company)
      if (apolloData.employee_count) {
        enrichmentData.employee_count = apolloData.employee_count
        enrichmentData.sources.employee_count = 'apollo'
        totalConfidence += 0.7
        dataPoints += 1
      }
      if (apolloData.revenue) {
        enrichmentData.revenue = apolloData.revenue
        enrichmentData.sources.revenue = 'apollo'
        totalConfidence += 0.6
        dataPoints += 1
      }
    } catch (error) {
      console.warn('Apollo enrichment failed:', error.message)
    }
  }

  // ZoomInfo simulation (placeholder)
  if (providers.includes('zoominfo')) {
    try {
      const zoomInfoData = await fetchFromZoomInfo(company)
      if (zoomInfoData.owner_phone) {
        enrichmentData.owner_phone = zoomInfoData.owner_phone
        enrichmentData.sources.owner_phone = 'zoominfo'
        totalConfidence += 0.75
        dataPoints += 1
      }
    } catch (error) {
      console.warn('ZoomInfo enrichment failed:', error.message)
    }
  }

  // Calculate overall confidence
  enrichmentData.confidence = dataPoints > 0 ? Math.min(totalConfidence / dataPoints, 1.0) : 0.1

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
  // ZoomInfo API would go here - for now return mock data
  return {
    owner_phone: '+1-555-' + Math.floor(Math.random() * 9000 + 1000)
  }
}