import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('=== SIMPLE SAVE API CALLED ===')
    
    // First, just try to parse the request
    const body = await request.json()
    console.log('Body parsed successfully')
    console.log('Companies count:', body.companies?.length)
    
    // Return success without database operation
    return NextResponse.json({
      success: true,
      message: `Received ${body.companies?.length || 0} companies`,
      test: true
    })
    
  } catch (error) {
    console.error('Simple save error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}