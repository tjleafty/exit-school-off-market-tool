import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Retrieve all enrichment sources with their priorities
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('enrichment_sources')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching enrichment sources:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, sources: data })
  } catch (error) {
    console.error('Error in GET /api/settings/enrichment-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update source priority
export async function PUT(request) {
  try {
    const { source_name, priority } = await request.json()

    if (!source_name || !priority) {
      return NextResponse.json(
        { error: 'source_name and priority are required' },
        { status: 400 }
      )
    }

    // Validate priority value
    const validPriorities = ['FIRST', 'SECOND', 'THIRD', 'DO_NOT_USE']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    // If setting a priority other than DO_NOT_USE, check if it's already assigned
    if (priority !== 'DO_NOT_USE') {
      const { data: existingSource } = await supabase
        .from('enrichment_sources')
        .select('source_name')
        .eq('priority', priority)
        .neq('source_name', source_name)
        .single()

      if (existingSource) {
        // Swap priorities: set the existing source to DO_NOT_USE first
        await supabase
          .from('enrichment_sources')
          .update({ priority: 'DO_NOT_USE' })
          .eq('source_name', existingSource.source_name)
      }
    }

    // Update the requested source
    const { data, error } = await supabase
      .from('enrichment_sources')
      .update({ priority, is_enabled: priority !== 'DO_NOT_USE' })
      .eq('source_name', source_name)
      .select()
      .single()

    if (error) {
      console.error('Error updating enrichment source:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, source: data })
  } catch (error) {
    console.error('Error in PUT /api/settings/enrichment-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
