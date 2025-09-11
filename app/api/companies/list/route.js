import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    console.log('=== LOADING COMPANIES LIST ===')
    
    const { searchParams } = new URL(request.url)
    const enrichedOnly = searchParams.get('enriched') === 'true'
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required to filter companies' },
        { status: 400 }
      )
    }

    // Join with searches table to filter by user
    let query = supabase
      .from('companies')
      .select(`
        *,
        searches!inner(
          user_id,
          name,
          industry,
          city,
          state
        )
      `)
      .eq('searches.user_id', userId)
      .order('created_at', { ascending: false })

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
            details: 'Execute the SQL in supabase/fix-user-isolation.sql file in your Supabase dashboard'
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