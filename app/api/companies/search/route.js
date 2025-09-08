import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      query, 
      filters = {}, 
      page = 1, 
      limit = 50,
      userId 
    } = body

    console.log('Company search request:', { query, filters, page, limit })

    // For now, we'll search existing companies in database
    // Later, this can integrate with external APIs (Google Places, Apollo, etc.)
    
    let searchQuery = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply search query
    if (query && query.trim()) {
      searchQuery = searchQuery.or(`name.ilike.%${query}%,industry.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Apply filters
    if (filters.industry) {
      searchQuery = searchQuery.eq('industry', filters.industry)
    }
    if (filters.location) {
      searchQuery = searchQuery.ilike('location', `%${filters.location}%`)
    }
    if (filters.employeesRange) {
      searchQuery = searchQuery.eq('employees_range', filters.employeesRange)
    }
    if (filters.revenueRange) {
      searchQuery = searchQuery.eq('revenue_range', filters.revenueRange)
    }
    if (filters.stage) {
      searchQuery = searchQuery.eq('company_stage', filters.stage)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    searchQuery = searchQuery.range(startIndex, startIndex + limit - 1)

    const { data: companies, error, count } = await searchQuery

    if (error) {
      console.error('Search error:', error)
      throw error
    }

    // Save search to history if user is provided
    if (userId) {
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          search_query: query || '',
          search_type: 'manual',
          filters: filters,
          results_count: companies?.length || 0,
          results: companies?.slice(0, 10).map(c => ({ 
            id: c.id, 
            name: c.name, 
            industry: c.industry 
          })) // Store first 10 results summary
        })
    }

    // For demo purposes, if no results found in database, return mock data
    let finalResults = companies || []
    
    if (finalResults.length === 0 && query) {
      // Generate mock companies based on search
      finalResults = generateMockCompanies(query, filters)
      
      // Optionally save mock companies to database for future searches
      if (finalResults.length > 0) {
        const { error: insertError } = await supabase
          .from('companies')
          .insert(finalResults.map(company => ({
            ...company,
            source: 'mock_data',
            added_by: userId
          })))
        
        if (insertError) {
          console.error('Error saving mock companies:', insertError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      companies: finalResults,
      total: count || finalResults.length,
      page,
      limit
    })

  } catch (error) {
    console.error('Company search error:', error)
    return NextResponse.json(
      { error: 'Failed to search companies', details: error.message },
      { status: 500 }
    )
  }
}

// Mock data generator for demo purposes
function generateMockCompanies(query, filters) {
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
    'Real Estate', 'Education', 'Consulting', 'Marketing', 'Logistics'
  ]
  
  const stages = ['Startup', 'Growth', 'Mature', 'Enterprise']
  const employeeRanges = ['1-10', '11-50', '51-200', '201-500', '500+']
  const revenueRanges = ['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+']
  
  const mockCompanies = []
  const numResults = Math.floor(Math.random() * 10) + 5 // 5-15 results
  
  for (let i = 0; i < numResults; i++) {
    mockCompanies.push({
      id: `mock-${Date.now()}-${i}`,
      name: `${query} Company ${i + 1}`,
      website: `https://www.${query.toLowerCase().replace(/\s+/g, '')}${i + 1}.com`,
      industry: filters.industry || industries[Math.floor(Math.random() * industries.length)],
      location: filters.location || `City ${i + 1}, State`,
      city: `City ${i + 1}`,
      state: 'State',
      country: 'USA',
      employees_range: filters.employeesRange || employeeRanges[Math.floor(Math.random() * employeeRanges.length)],
      revenue_range: filters.revenueRange || revenueRanges[Math.floor(Math.random() * revenueRanges.length)],
      company_stage: filters.stage || stages[Math.floor(Math.random() * stages.length)],
      description: `A leading company in ${filters.industry || 'the industry'} specializing in ${query} services and solutions.`,
      founded_year: 2010 + Math.floor(Math.random() * 14),
      linkedin_url: `https://linkedin.com/company/${query.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      is_enriched: false
    })
  }
  
  return mockCompanies
}