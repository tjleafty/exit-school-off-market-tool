import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    // Call the manual schema refresh function
    const { data, error } = await supabase.rpc('manual_schema_refresh')

    if (error) {
      console.error('Schema refresh error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to refresh schema cache',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'PostgREST schema cache refreshed successfully',
      data
    })

  } catch (error) {
    console.error('Schema refresh error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh schema cache'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check if schema refresh is available
export async function GET() {
  try {
    // Test if the function exists
    const { error } = await supabase.rpc('manual_schema_refresh')
    
    return NextResponse.json({
      available: !error,
      message: error ? 'Schema refresh function not available' : 'Schema refresh ready'
    })
  } catch (error) {
    return NextResponse.json({
      available: false,
      message: 'Schema refresh not configured'
    })
  }
}