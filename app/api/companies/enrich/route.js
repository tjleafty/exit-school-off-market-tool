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

    const { companyId, companyData } = body

    if (!companyId && !companyData) {
      console.error('Missing required parameters:', { companyId, companyData })
      return NextResponse.json(
        { error: 'Company ID or data is required', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    console.log('Step 0.5: Processing enrichment for:', companyId ? `ID: ${companyId}` : `Data: ${companyData?.name}`)

    // Start with minimal enrichment
    let enrichedData = companyData || {}
    console.log('Step 0.6: Initial data prepared')

    // Test database connection first
    console.log('Step 0.7: Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('Database connection failed:', testError)
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: testError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
    console.log('Step 0.8: Database connection successful')

    // Return success for now
    return NextResponse.json({
      success: true,
      message: 'Enrichment test successful',
      companyName: companyData?.name,
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