import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve enrichment history with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Filters
    const userId = searchParams.get('userId')
    const tier = searchParams.get('tier') // 'BASIC' or 'ENHANCED'
    const status = searchParams.get('status') // 'COMPLETED', 'FAILED', etc.
    const type = searchParams.get('type') // 'MANUAL', 'BULK', etc.
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const companyName = searchParams.get('companyName')

    // Build query
    let query = supabase
      .from('enrichment_history')
      .select(`
        *,
        users:user_id (
          id,
          email,
          name
        ),
        companies:company_id (
          id,
          name,
          website
        )
      `, { count: 'exact' })

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (tier) {
      query = query.eq('enrichment_tier', tier)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('enrichment_type', type)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: history, error, count } = await query

    if (error) {
      console.error('Error fetching enrichment history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/admin/enrichment-history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Log a new enrichment activity (used by enrichment process)
export async function POST(request) {
  try {
    const {
      companyId,
      userId,
      companyName,
      companyWebsite,
      companyIndustry,
      companyLocation,
      enrichmentTier = 'BASIC',
      enrichmentType = 'MANUAL',
      sourcesUsed = [],
      fieldsEnriched = [],
      fieldsRequested = 0,
      fieldsPopulated = 0,
      enrichmentConfidence,
      dataCompleteness,
      status = 'COMPLETED',
      errorMessage,
      enrichmentSnapshot = {},
      durationMs
    } = await request.json()

    if (!companyName) {
      return NextResponse.json(
        { error: 'companyName is required' },
        { status: 400 }
      )
    }

    // Call the database function to log enrichment
    const { data, error } = await supabase.rpc('log_enrichment_activity', {
      p_company_id: companyId,
      p_user_id: userId,
      p_company_name: companyName,
      p_company_website: companyWebsite,
      p_company_industry: companyIndustry,
      p_company_location: companyLocation,
      p_enrichment_tier: enrichmentTier,
      p_enrichment_type: enrichmentType,
      p_sources_used: sourcesUsed,
      p_fields_enriched: fieldsEnriched,
      p_fields_requested: fieldsRequested,
      p_fields_populated: fieldsPopulated,
      p_enrichment_confidence: enrichmentConfidence,
      p_data_completeness: dataCompleteness,
      p_status: status,
      p_error_message: errorMessage,
      p_enrichment_snapshot: enrichmentSnapshot,
      p_duration_ms: durationMs
    })

    if (error) {
      console.error('Error logging enrichment activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      historyId: data
    })

  } catch (error) {
    console.error('Error in POST /api/admin/enrichment-history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
