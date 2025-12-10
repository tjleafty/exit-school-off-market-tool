import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by user if userId provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: auditLogs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      logs: auditLogs || [],
      total: count || auditLogs?.length || 0
    })

  } catch (error) {
    console.error('Error in audit log API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
