import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    return NextResponse.json({
      success: true,
      message: 'Debug POST working',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}