import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    console.log('=== SAVE COMPANIES API CALLED ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { companies, userId, searchName, industry, city, state } = body

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      console.log('Error: No companies provided or invalid format')
      return NextResponse.json(
        { error: 'No companies provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.log('Error: User ID is required for company isolation')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log(`Saving ${companies.length} companies to database for user ${userId}...`)
    console.log('First company sample:', JSON.stringify(companies[0], null, 2))

    // Step 1: Prepare companies for insertion with user_id directly
    const companiesData = companies.map((company, index) => {
      console.log(`Processing company ${index + 1}:`, company.name)
      
      const processedCompany = {
        user_id: userId, // Link directly to the user
        place_id: String(company.place_id || company.id || `temp_${Date.now()}_${index}`),
        name: String(company.name || 'Unknown Company'),
        formatted_address: String(company.address || company.formatted_address || company.location || ''),
        location: String(company.location || company.formatted_address || company.address || ''),
        city: company.city ? String(company.city) : null,
        state: company.state ? String(company.state) : null,
        industry: company.industry ? String(company.industry) : null,
        phone: (company.phone || company.formatted_phone_number) ? String(company.phone || company.formatted_phone_number) : null,
        website: company.website ? String(company.website) : null,
        rating: company.rating ? parseFloat(company.rating) : null,
        user_ratings_total: company.user_ratings_total ? parseInt(company.user_ratings_total) : null,
        types: Array.isArray(company.types) ? company.types.join(', ') : (company.types ? String(company.types) : null),
        geometry: company.geometry ? (typeof company.geometry === 'object' ? JSON.stringify(company.geometry) : String(company.geometry)) : null,
        is_enriched: false // Companies are never enriched when first added to list
      }
      
      console.log(`Processed company ${index + 1}:`, processedCompany)
      return processedCompany
    })

    // Step 1.5: Verify user exists in auth.users table, if not create a temporary user record
    console.log('Checking if user exists in auth.users table...')
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      console.log('User not found in users table, creating temporary user record...')
      // User doesn't exist, create a basic user record
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
        // Continue anyway, the user might exist in auth.users but not public.users
      } else {
        console.log('Temporary user record created successfully')
      }
    } else if (existingUser) {
      console.log('User exists in users table:', existingUser.id)
    }
    
    console.log('About to insert companies data:', companiesData.length, 'companies')

    // Try to insert one company at a time to identify issues
    const results = []
    for (let i = 0; i < companiesData.length; i++) {
      try {
        console.log(`Inserting company ${i + 1}/${companiesData.length}:`, companiesData[i].name)
        
        const { data, error } = await supabase
          .from('companies')
          .upsert([companiesData[i]], {
            onConflict: 'place_id',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          console.error(`Error inserting company ${i + 1}:`, error)
          throw error
        }
        
        console.log(`Successfully inserted company ${i + 1}:`, data?.[0]?.name)
        results.push(...(data || []))
      } catch (companyError) {
        console.error(`Failed to insert company ${i + 1} (${companiesData[i].name}):`, companyError)
        // Continue with other companies
      }
    }

    console.log(`Processing complete. Successfully saved ${results.length} out of ${companies.length} companies`)

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No companies could be saved. Check server logs for details.',
        error: 'All company inserts failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} companies added to your list`,
      data: results,
      total: results.length,
      attempted: companies.length
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