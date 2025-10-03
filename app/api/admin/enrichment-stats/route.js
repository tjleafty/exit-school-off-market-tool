import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve enrichment statistics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const groupBy = searchParams.get('groupBy') // 'user', 'date', 'summary'

    if (groupBy === 'user') {
      // Get stats by user
      const { data, error } = await supabase
        .from('enrichment_stats_by_user')
        .select('*')
        .order('total_enrichments', { ascending: false })

      if (error) {
        console.error('Error fetching user stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        type: 'by_user',
        stats: data
      })

    } else if (groupBy === 'date') {
      // Get stats by date
      const { data, error } = await supabase
        .from('enrichment_stats_by_date')
        .select('*')
        .gte('enrichment_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('enrichment_date', { ascending: false })

      if (error) {
        console.error('Error fetching date stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        type: 'by_date',
        stats: data
      })

    } else {
      // Get summary stats
      const { data, error } = await supabase.rpc('get_enrichment_summary', {
        p_days: days
      })

      if (error) {
        console.error('Error fetching summary stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        type: 'summary',
        stats: data[0] || {},
        period_days: days
      })
    }

  } catch (error) {
    console.error('Error in GET /api/admin/enrichment-stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
