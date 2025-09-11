import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request) {
  try {
    console.log('=== TESTING DATABASE CONNECTION ===')
    
    // Try a simple query first
    console.log('Testing basic connection...')
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1)

    if (testError) {
      console.log('Basic query error:', testError)
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: testError.message
      })
    }

    console.log('Basic query successful, found:', testData?.length || 0, 'companies')

    // Try to check table structure
    console.log('Checking table structure...')
    const { data: structureData, error: structureError } = await supabase
      .rpc('pg_get_tabledef', { table_name: 'companies' })
      .single()

    if (structureError) {
      console.log('Structure check failed (this is normal):', structureError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Database test completed',
      companiesFound: testData?.length || 0,
      sampleData: testData?.[0] || null
    })

  } catch (error) {
    console.error('=== DATABASE TEST ERROR ===')
    console.error('Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}