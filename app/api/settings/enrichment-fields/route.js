import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve all enrichment fields with their tier configurations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') // 'BASIC', 'ENHANCED', 'BOTH', or null for all
    const category = searchParams.get('category') // Filter by category

    let query = supabase
      .from('enrichment_fields')
      .select('*')
      .order('field_category')
      .order('sort_order')

    if (tier) {
      if (tier === 'BOTH') {
        query = query.in('tier', ['BASIC', 'ENHANCED', 'BOTH'])
      } else {
        query = query.or(`tier.eq.${tier},tier.eq.BOTH`)
      }
    }

    if (category) {
      query = query.eq('field_category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching enrichment fields:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group fields by category
    const fieldsByCategory = data.reduce((acc, field) => {
      if (!acc[field.field_category]) {
        acc[field.field_category] = []
      }
      acc[field.field_category].push(field)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      fields: data,
      fieldsByCategory,
      summary: {
        total: data.length,
        basic: data.filter(f => f.tier === 'BASIC' || f.tier === 'BOTH').length,
        enhanced: data.filter(f => f.tier === 'ENHANCED' || f.tier === 'BOTH').length,
        none: data.filter(f => f.tier === 'NONE').length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/settings/enrichment-fields:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update field tier configuration
export async function PUT(request) {
  try {
    const { field_name, tier, sort_order } = await request.json()

    if (!field_name || !tier) {
      return NextResponse.json(
        { error: 'field_name and tier are required' },
        { status: 400 }
      )
    }

    // Validate tier value
    const validTiers = ['BASIC', 'ENHANCED', 'BOTH', 'NONE']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier value' },
        { status: 400 }
      )
    }

    const updateData = { tier }
    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }

    // Update the field configuration
    const { data, error } = await supabase
      .from('enrichment_fields')
      .update(updateData)
      .eq('field_name', field_name)
      .select()
      .single()

    if (error) {
      console.error('Error updating enrichment field:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, field: data })
  } catch (error) {
    console.error('Error in PUT /api/settings/enrichment-fields:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Bulk update field tiers
export async function POST(request) {
  try {
    const { updates } = await request.json()

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'updates must be an array' },
        { status: 400 }
      )
    }

    // Validate all updates
    const validTiers = ['BASIC', 'ENHANCED', 'BOTH', 'NONE']
    for (const update of updates) {
      if (!update.field_name || !update.tier) {
        return NextResponse.json(
          { error: 'Each update must have field_name and tier' },
          { status: 400 }
        )
      }
      if (!validTiers.includes(update.tier)) {
        return NextResponse.json(
          { error: `Invalid tier value: ${update.tier}` },
          { status: 400 }
        )
      }
    }

    // Perform bulk update
    const results = []
    const errors = []

    for (const update of updates) {
      const updateData = { tier: update.tier }
      if (update.sort_order !== undefined) {
        updateData.sort_order = update.sort_order
      }

      const { data, error } = await supabase
        .from('enrichment_fields')
        .update(updateData)
        .eq('field_name', update.field_name)
        .select()
        .single()

      if (error) {
        errors.push({ field_name: update.field_name, error: error.message })
      } else {
        results.push(data)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error in POST /api/settings/enrichment-fields:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
