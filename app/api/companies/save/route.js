import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    console.log('=== SAVE COMPANIES API CALLED ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { companies } = body

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      console.log('Error: No companies provided or invalid format')
      return NextResponse.json(
        { error: 'No companies provided' },
        { status: 400 }
      )
    }

    console.log(`Saving ${companies.length} companies to database...`)
    console.log('First company sample:', JSON.stringify(companies[0], null, 2))

    // Prepare companies for insertion (simplified for basic table)
    const companiesData = companies.map((company, index) => {
      console.log(`Processing company ${index + 1}:`, company.name)
      
      const processedCompany = {
        place_id: company.place_id || company.id,
        name: company.name,
        formatted_address: company.address || company.formatted_address || company.location,
        location: company.location || company.formatted_address || company.address,
        city: company.city,
        state: company.state,
        industry: company.industry,
        phone: company.phone || company.formatted_phone_number,
        website: company.website,
        rating: company.rating ? parseFloat(company.rating) : null,
        user_ratings_total: company.user_ratings_total ? parseInt(company.user_ratings_total) : null,
        types: Array.isArray(company.types) ? company.types.join(', ') : (company.types || ''),
        geometry: typeof company.geometry === 'object' ? JSON.stringify(company.geometry) : (company.geometry || ''),
        is_enriched: company.is_enriched || false
      }
      
      console.log(`Processed company ${index + 1}:`, processedCompany)
      return processedCompany
    })
    
    console.log('About to insert companies data:', companiesData.length, 'companies')

    // Use upsert to avoid duplicates (update if exists, insert if not)
    const { data, error } = await supabase
      .from('companies')
      .upsert(companiesData, {
        onConflict: 'place_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error saving companies:', error)
      
      // If table doesn't exist, provide helpful error message
      if (error.message?.includes('relation "companies" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Companies table not found. Please run the database migration script.',
            details: 'Execute the SQL in supabase/companies-table.sql file in your Supabase dashboard'
          },
          { status: 500 }
        )
      }
      
      throw error
    }

    console.log(`Successfully saved ${data?.length || companies.length} companies`)

    return NextResponse.json({
      success: true,
      message: `${data?.length || companies.length} companies added to your list`,
      data
    })
  } catch (error) {
    console.error('=== ERROR SAVING COMPANIES ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save companies',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}