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

  const pathname = request.nextUrl.pathname

  // Define route patterns
  const isUserRoute = pathname.startsWith('/user/') || pathname.match(/^\/(user)($|\/.*)/g)
  const isAdminRoute = pathname.startsWith('/admin/') || pathname.match(/^\/(admin)($|\/.*)/g)
  const isPublicRoute = pathname.startsWith('/request') || 
                       pathname.startsWith('/signup') ||
                       pathname.startsWith('/login') ||
                       pathname.startsWith('/api/') ||
                       pathname === '/' ||
                       pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon')

  // If no user and trying to access protected routes, redirect to login
  if (!user && (isUserRoute || isAdminRoute)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user exists, check their status and role
  if (user && (isUserRoute || isAdminRoute)) {
    try {
      // Get user profile with status and role
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('status, role, auth_user_id')
        .eq('auth_user_id', user.id)
        .single()

      if (error || !userProfile) {
        // User not found in our users table, redirect to login
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=Account not found', request.url))
      }

      // Check if user account is active
      if (userProfile.status !== 'ACTIVE') {
        await supabase.auth.signOut()
        let errorMessage = 'Account not active'
        
        if (userProfile.status === 'REQUESTED') {
          errorMessage = 'Your account is pending approval'
        } else if (userProfile.status === 'APPROVED') {
          errorMessage = 'Please complete your account setup'
        } else if (userProfile.status === 'DISABLED') {
          errorMessage = 'Your account has been disabled'
        }
        
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url))
      }

      // Check admin route access
      if (isAdminRoute && userProfile.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/user/dashboard?error=Access denied', request.url))
      }

    } catch (error) {
      console.error('Middleware error:', error)
      // On error, redirect to login
      return NextResponse.redirect(new URL('/login?error=Authentication error', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/request')) {
    try {
      // Get user role to determine redirect destination
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, status')
        .eq('auth_user_id', user.id)
        .single()

      if (userProfile?.status === 'ACTIVE') {
        const redirectPath = userProfile.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      } else {
        // If user exists but account is not active, allow access to auth pages
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Redirect middleware error:', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}