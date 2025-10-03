import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Diagnostic endpoint to check enrichment system setup
 * GET /api/admin/check-enrichment-setup
 */
export async function GET() {
  const checks = {
    enrichment_sources: { exists: false, count: 0, error: null },
    enrichment_fields: { exists: false, count: 0, error: null, by_category: {} },
    enrichment_history: { exists: false, count: 0, error: null },
    views: { stats_by_user: false, stats_by_date: false, recent_activity: false }
  }

  try {
    // Check enrichment_sources table
    const { data: sources, error: sourcesError } = await supabase
      .from('enrichment_sources')
      .select('*', { count: 'exact' })

    if (sourcesError) {
      checks.enrichment_sources.error = sourcesError.message
    } else {
      checks.enrichment_sources.exists = true
      checks.enrichment_sources.count = sources?.length || 0
      checks.enrichment_sources.data = sources
    }

    // Check enrichment_fields table
    const { data: fields, error: fieldsError, count: fieldsCount } = await supabase
      .from('enrichment_fields')
      .select('*', { count: 'exact' })

    if (fieldsError) {
      checks.enrichment_fields.error = fieldsError.message
    } else {
      checks.enrichment_fields.exists = true
      checks.enrichment_fields.count = fieldsCount || 0

      // Group by category
      if (fields) {
        checks.enrichment_fields.by_category = fields.reduce((acc, field) => {
          if (!acc[field.field_category]) {
            acc[field.field_category] = 0
          }
          acc[field.field_category]++
          return acc
        }, {})

        // Group by tier
        checks.enrichment_fields.by_tier = fields.reduce((acc, field) => {
          if (!acc[field.tier]) {
            acc[field.tier] = 0
          }
          acc[field.tier]++
          return acc
        }, {})
      }
    }

    // Check enrichment_history table
    const { error: historyError, count: historyCount } = await supabase
      .from('enrichment_history')
      .select('*', { count: 'exact', head: true })

    if (historyError) {
      checks.enrichment_history.error = historyError.message
    } else {
      checks.enrichment_history.exists = true
      checks.enrichment_history.count = historyCount || 0
    }

    // Check views
    try {
      const { error: viewError1 } = await supabase
        .from('enrichment_stats_by_user')
        .select('*')
        .limit(1)
      checks.views.stats_by_user = !viewError1
    } catch (e) {
      checks.views.stats_by_user = false
    }

    try {
      const { error: viewError2 } = await supabase
        .from('enrichment_stats_by_date')
        .select('*')
        .limit(1)
      checks.views.stats_by_date = !viewError2
    } catch (e) {
      checks.views.stats_by_date = false
    }

    try {
      const { error: viewError3 } = await supabase
        .from('recent_enrichment_activity')
        .select('*')
        .limit(1)
      checks.views.recent_activity = !viewError3
    } catch (e) {
      checks.views.recent_activity = false
    }

    // Overall status
    const allTablesExist =
      checks.enrichment_sources.exists &&
      checks.enrichment_fields.exists &&
      checks.enrichment_history.exists

    const fieldsPopulated = checks.enrichment_fields.count >= 60 // Should have ~65

    const allViewsWork =
      checks.views.stats_by_user &&
      checks.views.stats_by_date &&
      checks.views.recent_activity

    return NextResponse.json({
      success: true,
      setup_complete: allTablesExist && fieldsPopulated && allViewsWork,
      checks,
      recommendations: getRecommendations(checks)
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      checks
    }, { status: 500 })
  }
}

function getRecommendations(checks) {
  const recommendations = []

  if (!checks.enrichment_sources.exists) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Run migration 007_enrichment_sources.sql',
      reason: 'Enrichment sources table does not exist'
    })
  } else if (checks.enrichment_sources.count === 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Re-run INSERT statements from migration 007',
      reason: 'Enrichment sources table is empty'
    })
  }

  if (!checks.enrichment_fields.exists) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Run migration 008_enrichment_fields_system.sql',
      reason: 'Enrichment fields table does not exist'
    })
  } else if (checks.enrichment_fields.count === 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Re-run INSERT statements from migration 008',
      reason: 'Enrichment fields table is empty - UI will show no fields'
    })
  } else if (checks.enrichment_fields.count < 60) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Check migration 008 INSERT statements',
      reason: `Only ${checks.enrichment_fields.count} fields found (expected ~65)`
    })
  }

  if (!checks.enrichment_history.exists) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Run migration 009_enrichment_history.sql',
      reason: 'Enrichment history table does not exist'
    })
  }

  if (!checks.views.stats_by_user || !checks.views.stats_by_date || !checks.views.recent_activity) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Run migration 009_enrichment_history_fixed.sql',
      reason: 'One or more views have errors'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'SUCCESS',
      action: 'System is fully configured!',
      reason: 'All tables, fields, and views are working correctly'
    })
  }

  return recommendations
}
