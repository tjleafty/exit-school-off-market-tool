import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    console.log('=== ADMIN USER ACTIVITY API ===')
    
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching activity for user:', userId)

    // Fetch user's companies (search history)
    console.log('Fetching user companies...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        location,
        city,
        state,
        industry,
        phone,
        website,
        rating,
        user_ratings_total,
        is_enriched,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      throw companiesError
    }

    console.log(`Found ${companies?.length || 0} companies for user`)

    // Fetch user's reports
    console.log('Fetching user reports...')
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id,
        company_name,
        report_type,
        status,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      // Don't throw error for reports, just log it
      console.log('Reports table might not exist or be accessible, continuing...')
    }

    console.log(`Found ${reports?.length || 0} reports for user`)

    // Get user info for context - with fallback
    let userInfo = null
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, status, created_at')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user info:', userError)
      // Create a fallback user info object
      userInfo = {
        id: userId,
        name: `User ${userId.substring(0, 8)}`,
        email: `user-${userId}@example.com`,
        role: 'USER',
        status: 'ACTIVE',
        created_at: null
      }
      console.log('Using fallback user info:', userInfo)
    } else {
      userInfo = userData
    }

    // Calculate activity statistics
    const totalCompanies = companies?.length || 0
    const enrichedCompanies = companies?.filter(c => c.is_enriched)?.length || 0
    const totalReports = reports?.length || 0
    
    // Group companies by date for search history
    const searchHistory = {}
    companies?.forEach(company => {
      const date = company.created_at?.split('T')[0] || 'Unknown'
      if (!searchHistory[date]) {
        searchHistory[date] = []
      }
      searchHistory[date].push(company)
    })

    const response = {
      success: true,
      user: userInfo,
      activity: {
        totalCompanies,
        enrichedCompanies,
        totalReports,
        searchHistory,
        companies: companies || [],
        reports: reports || []
      }
    }

    console.log('User activity data prepared successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('=== ERROR FETCHING USER ACTIVITY ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch user activity',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}