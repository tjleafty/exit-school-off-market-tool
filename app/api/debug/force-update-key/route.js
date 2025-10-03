import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const { service, apiKey } = body

    if (!service || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Service and apiKey are required'
      }, { status: 400 })
    }

    console.log(`=== FORCE UPDATE API KEY FOR: ${service} ===`)

    // Step 1: Delete any existing key for this service
    console.log(`Step 1: Deleting existing ${service} key...`)
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('service', service)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      // Don't fail if delete errors - might not exist
    } else {
      console.log('✓ Old key deleted')
    }

    // Step 2: Wait a moment to ensure delete is committed
    await new Promise(resolve => setTimeout(resolve, 100))

    // Step 3: Insert fresh new key
    console.log(`Step 2: Inserting fresh ${service} key...`)
    const { data: insertData, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        service: service,
        encrypted_key: apiKey,
        status: 'Connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert new key',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('✓ New key inserted successfully')

    // Step 4: Verify the new key is in the database
    console.log('Step 3: Verifying new key...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('api_keys')
      .select('service, status, encrypted_key')
      .eq('service', service)
      .single()

    if (verifyError) {
      console.error('Verify error:', verifyError)
      return NextResponse.json({
        success: false,
        error: 'Key inserted but verification failed',
        details: verifyError.message
      }, { status: 500 })
    }

    const keyPreview = verifyData.encrypted_key.substring(0, 20) + '...'
    console.log('✓ Verified key in database:', keyPreview)

    return NextResponse.json({
      success: true,
      message: `${service} API key force-updated successfully`,
      keyPreview: keyPreview,
      status: verifyData.status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Force update error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
