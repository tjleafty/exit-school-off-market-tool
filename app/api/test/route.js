import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Test API endpoint called')
  return NextResponse.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request) {
  try {
    console.log('Test POST endpoint called')
    const body = await request.json()
    console.log('Received body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'POST API is working',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}