'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

type Supabase = Database

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    // Check for error or success messages in URL params
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam))
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Please enter both email and password')
      }

      // Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      })

      if (authError) {
        throw authError
      }

      if (!data.user) {
        throw new Error('Login failed. Please try again.')
      }

      // Verify user exists in our users table and is active
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, status, role, name')
        .eq('auth_user_id', data.user.id)
        .single()

      if (profileError || !userProfile) {
        await supabase.auth.signOut()
        throw new Error('Account not found. Please contact support.')
      }

      // Check account status
      if (userProfile.status !== 'ACTIVE') {
        await supabase.auth.signOut()
        
        let statusMessage = 'Account not active'
        if (userProfile.status === 'REQUESTED') {
          statusMessage = 'Your account is pending admin approval'
        } else if (userProfile.status === 'APPROVED') {
          statusMessage = 'Please complete your account setup using the invitation email'
        } else if (userProfile.status === 'DISABLED') {
          statusMessage = 'Your account has been disabled. Please contact support.'
        }
        
        throw new Error(statusMessage)
      }

      // Create audit log for successful login
      await supabase.rpc('create_audit_log', {
        p_user_id: data.user.id,
        p_action: 'USER_LOGIN',
        p_entity: 'USER',
        p_entity_id: userProfile.id,
        p_metadata: {
          email: email.toLowerCase().trim(),
          user_agent: navigator.userAgent,
          login_method: 'email_password'
        }
      })

      toast({
        title: 'Welcome back!',
        description: `Hello ${userProfile.name || 'User'}`
      })

      // Redirect based on role and redirectTo param
      const redirectTo = searchParams.get('redirectTo')
      let redirectPath = '/'

      if (redirectTo && (redirectTo.startsWith('/user/') || redirectTo.startsWith('/admin/'))) {
        // Validate redirect path matches user role
        if (redirectTo.startsWith('/admin/') && userProfile.role === 'ADMIN') {
          redirectPath = redirectTo
        } else if (redirectTo.startsWith('/user/') && userProfile.role !== 'ADMIN') {
          redirectPath = redirectTo
        } else {
          // Default redirect based on role
          redirectPath = userProfile.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard'
        }
      } else {
        // Default redirect based on role
        redirectPath = userProfile.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard'
      }

      router.push(redirectPath)

    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.')
      
      // Create audit log for failed login
      try {
        await supabase.rpc('create_audit_log', {
          p_user_id: null,
          p_action: 'USER_LOGIN_FAILED',
          p_entity: 'USER',
          p_entity_id: null,
          p_metadata: {
            email: email.toLowerCase().trim(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            user_agent: navigator.userAgent
          }
        })
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-2xl">
            <LogIn className="h-6 w-6 mr-2" />
            Sign In
          </CardTitle>
          <CardDescription>
            Access your Exit School Off-Market Tool account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={loading || !email || !password} 
                className="w-full"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-4 text-center text-sm">
            <div className="text-gray-500">
              <p>Don't have an account?</p>
              <Link href="/request" className="text-blue-600 hover:text-blue-800 font-medium">
                Request access here
              </Link>
            </div>
            
            <div className="border-t pt-4">
              <Link href="/" className="text-gray-600 hover:text-gray-800">
                ← Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}