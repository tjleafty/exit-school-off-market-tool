import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET() {
  try {
    console.log('=== TESTING COMPANIES TABLE ===')
    
    // Test 1: Try to select from companies table
    console.log('Test 1: Checking if companies table exists...')
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('Table access error:', error.message)
      return NextResponse.json({
        tableExists: false,
        error: error.message,
        suggestion: 'Run the SQL script in supabase/simple-companies-table.sql'
      })
    }
    
    console.log('Table exists and is accessible')
    
    // Test 2: Try to insert a minimal test record
    console.log('Test 2: Attempting to insert test record...')
    const testCompany = {
      place_id: 'test_' + Date.now(),
      name: 'Test Company',
      formatted_address: 'Test Address',
      location: 'Test Location',
      is_enriched: false
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('companies')
      .insert([testCompany])
      .select()
    
    if (insertError) {
      console.log('Insert error:', insertError.message)
      return NextResponse.json({
        tableExists: true,
        canSelect: true,
        canInsert: false,
        insertError: insertError.message,
        insertErrorDetails: insertError
      })
    }
    
    console.log('Insert successful:', insertData)
    
    // Clean up test record
    await supabase
      .from('companies')
      .delete()
      .eq('place_id', testCompany.place_id)
    
    return NextResponse.json({
      tableExists: true,
      canSelect: true,
      canInsert: true,
      recordCount: data?.length || 0,
      testInsertSuccess: true,
      message: 'Companies table is working correctly!'
    })
    
  } catch (error) {
    console.error('Table test error:', error)
    return NextResponse.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}