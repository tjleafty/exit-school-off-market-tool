import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Clay Webhook Receiver Endpoint
 *
 * This endpoint receives enriched company data from Clay after async enrichment
 * Clay will POST the enriched data back to this endpoint after processing
 */
export async function POST(request) {
  try {
    console.log('=== CLAY WEBHOOK RECEIVED ===')

    // Optional: Verify authorization token if configured
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLAY_WEBHOOK_SECRET

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.error('Unauthorized Clay webhook attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Clay webhook payload:', JSON.stringify(body, null, 2))

    // Extract company ID and enriched data from Clay's response
    const { company_id, ...enrichedData } = body

    if (!company_id) {
      console.error('No company_id in Clay webhook payload')
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    // Get the company from database
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      console.error('Company not found:', company_id)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Merge Clay data into existing enrichment_data
    const existingEnrichmentData = company.enrichment_data || {}
    const updatedEnrichmentData = {
      ...existingEnrichmentData,
      clay_data: enrichedData,
      enriched_at: new Date().toISOString()
    }

    // Update company with Clay enrichment data and mark as completed
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        enrichment_data: updatedEnrichmentData,
        clay_enrichment_status: 'completed',
        clay_enrichment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', company_id)

    if (updateError) {
      console.error('Failed to update company with Clay data:', updateError)
      throw updateError
    }

    console.log(`✓ Successfully stored Clay enrichment data for company: ${company.name}`)

    // Create audit log
    try {
      await supabase.rpc('create_audit_log', {
        p_user_id: null, // System action
        p_action: 'CLAY_ENRICHMENT_RECEIVED',
        p_entity: 'ENRICHMENT',
        p_entity_id: company_id,
        p_metadata: {
          fields_received: Object.keys(enrichedData).length,
          timestamp: new Date().toISOString()
        }
      })
    } catch (auditError) {
      console.warn('Failed to create audit log (non-critical):', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Clay enrichment data received and stored',
      company_id
    })

  } catch (error) {
    console.error('Clay webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process Clay webhook', details: error.message },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
