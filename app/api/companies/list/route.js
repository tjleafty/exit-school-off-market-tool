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

    // Verify user exists, if not return empty results
    console.log('Checking if user exists in users table...')
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      console.log('User not found in users table, creating temporary user record...')
      // User doesn't exist, create a basic user record like save API does
      const { error: createUserError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: `temp-user-${userId}@example.com`,
          role: 'USER',
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        }])
      
      if (createUserError) {
        console.error('Failed to create temporary user:', createUserError)
        // Continue anyway - user might exist in auth but not public.users
      } else {
        console.log('Temporary user record created successfully for list API')
      }
    }

    // Filter companies by user_id directly (simplified approach)
    let query = supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
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