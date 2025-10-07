import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    console.log('=== LOADING COMPANIES LIST ===')

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const enrichedOnly = url.searchParams.get('enriched') === 'true'

    let query = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by user_id - critical for data isolation
    if (userId) {
      console.log('Filtering companies for user:', userId)
      query = query.eq('user_id', userId)
    } else {
      console.warn('WARNING: No userId provided - returning all companies')
    }

    if (enrichedOnly) {
      query = query.eq('is_enriched', true)
    }

    console.log('Executing database query...')
    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      
      // If table doesn't exist, provide helpful error message
      if (error.message?.includes('relation "companies" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Companies table not found. Please run the database migration.',
            details: 'Execute the SQL in supabase/companies-table.sql file in your Supabase dashboard'
          },
          { status: 500 }
        )
      }
      
      throw error
    }

    console.log(`Found ${data?.length || 0} companies in database`)

    return NextResponse.json({
      success: true,
      companies: data || [],
      total: data?.length || 0
    })
  } catch (error) {
    console.error('=== ERROR LOADING COMPANIES ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to load companies',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}