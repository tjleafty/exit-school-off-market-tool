import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user is accessing protected routes
  const isUserRoute = request.nextUrl.pathname.startsWith('/(user)')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/(admin)')
  const isPublicRoute = request.nextUrl.pathname.startsWith('/(public)') || 
                       request.nextUrl.pathname === '/' ||
                       request.nextUrl.pathname.startsWith('/login')

  // If no user and trying to access protected routes, redirect to login
  if (!user && (isUserRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user exists, check role for admin routes
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/user/dashboard', request.url))
    }
  }

  // Redirect authenticated users away from public routes
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/user/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}