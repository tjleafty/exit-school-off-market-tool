import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { companies } = body

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies provided' },
        { status: 400 }
      )
    }

    console.log(`Saving ${companies.length} companies to database...`)

    // Prepare companies for insertion
    const companiesData = companies.map(company => ({
      place_id: company.place_id || company.id,
      name: company.name,
      formatted_address: company.address || company.formatted_address || company.location,
      city: company.city,
      state: company.state,
      industry: company.industry,
      phone: company.phone || company.formatted_phone_number,
      website: company.website,
      rating: company.rating,
      user_ratings_total: company.user_ratings_total,
      types: company.types,
      geometry: company.geometry,
      is_enriched: company.is_enriched || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

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
      throw error
    }

    console.log(`Successfully saved ${data?.length || companies.length} companies`)

    return NextResponse.json({
      success: true,
      message: `${data?.length || companies.length} companies added to your list`,
      data
    })
  } catch (error) {
    console.error('Error saving companies:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save companies'
      },
      { status: 500 }
    )
  }
}