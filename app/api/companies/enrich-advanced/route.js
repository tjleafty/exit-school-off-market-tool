import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Advanced enrichment endpoint that respects field tier configuration
 * POST /api/companies/enrich-advanced
 *
 * Body: {
 *   companyId: string,
 *   tier: 'BASIC' | 'ENHANCED'  // determines which fields to include
 * }
 */
export async function POST(request) {
  const startTime = Date.now()

  try {
    const { companyId, tier = 'BASIC', userId, enrichmentType = 'MANUAL' } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log(`Starting advanced enrichment for company ${companyId} with tier: ${tier}`)

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: `Company not found: ${companyError?.message}` },
        { status: 404 }
      )
    }

    // Get enrichment fields for the requested tier
    const { data: enrichmentFields, error: fieldsError } = await supabase
      .from('enrichment_fields')
      .select('field_name, display_name, data_type, field_category')
      .or(`tier.eq.${tier},tier.eq.BOTH`)
      .order('sort_order')

    if (fieldsError) {
      console.error('Error loading enrichment fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to load enrichment configuration' },
        { status: 500 }
      )
    }

    console.log(`Loaded ${enrichmentFields.length} fields for ${tier} tier`)

    // Get enrichment source priorities
    const { data: sources, error: sourcesError } = await supabase
      .from('enrichment_sources')
      .select('source_name, priority, display_name')
      .eq('is_enabled', true)
      .neq('priority', 'DO_NOT_USE')
      .order('priority', { ascending: true })

    if (sourcesError || !sources || sources.length === 0) {
      console.warn('No enrichment sources configured, using defaults')
    }

    const activeSources = sources?.map(s => s.source_name) || ['zoominfo', 'hunter', 'apollo']
    console.log('Active enrichment sources:', activeSources)

    // Call enrichment Edge Function
    const enrichmentResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-company`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          companyId,
          providers: activeSources
        })
      }
    )

    if (!enrichmentResponse.ok) {
      const errorText = await enrichmentResponse.text()
      throw new Error(`Enrichment function failed: ${errorText}`)
    }

    const enrichmentResult = await enrichmentResponse.json()

    // Filter enrichment data to only include configured fields for this tier
    const allowedFields = new Set(enrichmentFields.map(f => f.field_name))
    const filteredEnrichmentData = {}

    // Map common field names to ZoomInfo field names
    const fieldMapping = {
      'owner_email': 'owner_email',
      'owner_name': 'owner_name',
      'owner_phone': 'owner_phone',
      'owner_first_name': 'first_name',
      'owner_last_name': 'last_name',
      'company_name': 'name',
      'company_phone': 'phone',
      'company_description': 'description',
      'employees': 'employee_count',
      'revenue': 'revenue',
      'street_address': 'address',
      'city': 'city',
      'state': 'state',
      'zip_code': 'zip_code',
      'country': 'country',
      'website': 'website'
    }

    // Build filtered enrichment data based on tier
    enrichmentFields.forEach(field => {
      const sourceField = fieldMapping[field.field_name] || field.field_name
      if (enrichmentResult.enrichmentData && enrichmentResult.enrichmentData[sourceField] !== undefined) {
        filteredEnrichmentData[field.field_name] = enrichmentResult.enrichmentData[sourceField]
      }
    })

    // Update company with enriched data
    const updateData = {
      enrichment_data: filteredEnrichmentData,
      enrichment_tier: tier,
      is_enriched: true,
      enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating company:', updateError)
      return NextResponse.json(
        { error: 'Failed to save enriched data' },
        { status: 500 }
      )
    }

    console.log(`Successfully enriched company ${companyId} with ${tier} tier`)

    // Calculate metrics
    const durationMs = Date.now() - startTime
    const fieldsPopulated = Object.keys(filteredEnrichmentData).length
    const fieldsRequested = enrichmentFields.length
    const dataCompleteness = fieldsRequested > 0 ? fieldsPopulated / fieldsRequested : 0
    const fieldsEnriched = Object.keys(filteredEnrichmentData)

    // Log enrichment history
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/rest/v1/rpc/log_enrichment_activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_company_id: companyId,
          p_user_id: userId || null,
          p_company_name: company.name || 'Unknown',
          p_company_website: company.website || null,
          p_company_industry: company.industry || null,
          p_company_location: company.city && company.state ? `${company.city}, ${company.state}` : null,
          p_enrichment_tier: tier,
          p_enrichment_type: enrichmentType,
          p_sources_used: activeSources,
          p_fields_enriched: fieldsEnriched,
          p_fields_requested: fieldsRequested,
          p_fields_populated: fieldsPopulated,
          p_enrichment_confidence: enrichmentResult.enrichmentData?.confidence || null,
          p_data_completeness: dataCompleteness,
          p_status: 'COMPLETED',
          p_enrichment_snapshot: filteredEnrichmentData,
          p_duration_ms: durationMs
        })
      })
      console.log('Enrichment history logged successfully')
    } catch (historyError) {
      console.error('Failed to log enrichment history:', historyError)
      // Don't fail the request if history logging fails
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
      tier,
      fieldsIncluded: enrichmentFields.length,
      fieldsPopulated,
      dataCompleteness: Math.round(dataCompleteness * 100),
      enrichmentData: filteredEnrichmentData,
      sources: activeSources,
      durationMs
    })

  } catch (error) {
    console.error('Error in advanced enrichment:', error)

    // Log failed enrichment
    const durationMs = Date.now() - startTime
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/rest/v1/rpc/log_enrichment_activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_company_id: companyId || null,
          p_user_id: userId || null,
          p_company_name: 'Unknown',
          p_enrichment_tier: tier || 'BASIC',
          p_enrichment_type: enrichmentType || 'MANUAL',
          p_status: 'FAILED',
          p_error_message: error.message,
          p_duration_ms: durationMs
        })
      })
    } catch (historyError) {
      console.error('Failed to log failed enrichment:', historyError)
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to preview what fields would be included in each tier
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') || 'BASIC'

    const { data: enrichmentFields, error } = await supabase
      .from('enrichment_fields')
      .select('field_name, display_name, field_category, data_type')
      .or(`tier.eq.${tier},tier.eq.BOTH`)
      .order('field_category')
      .order('sort_order')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category
    const fieldsByCategory = enrichmentFields.reduce((acc, field) => {
      if (!acc[field.field_category]) {
        acc[field.field_category] = []
      }
      acc[field.field_category].push(field)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      tier,
      totalFields: enrichmentFields.length,
      fields: enrichmentFields,
      fieldsByCategory
    })

  } catch (error) {
    console.error('Error getting enrichment field preview:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
