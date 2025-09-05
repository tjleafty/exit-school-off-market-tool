import { NextResponse } from 'next/server'

export async function middleware(request) {
  // For demo purposes, allow all routes
  // In production, implement proper authentication middleware
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}