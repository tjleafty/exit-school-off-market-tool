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
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

type Supabase = Database

export default function SignupPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    if (token) {
      validateInvitation()
    } else {
      setTokenError('No invitation token provided')
      setValidatingToken(false)
    }
  }, [token])

  async function validateInvitation() {
    try {
      setValidatingToken(true)

      // Get invitation details
      const { data: invitationData, error } = await supabase
        .from('invitations')
        .select(`
          *,
          users (
            id,
            email,
            name,
            status
          )
        `)
        .eq('token', token)
        .eq('status', 'SENT')
        .single()

      if (error || !invitationData) {
        throw new Error('Invalid or expired invitation link')
      }

      // Check if invitation is still valid
      if (new Date(invitationData.expires_at) < new Date()) {
        throw new Error('This invitation has expired. Please request a new one.')
      }

      // Check if user is in correct status
      if (invitationData.users.status !== 'APPROVED') {
        throw new Error('This invitation is not valid. Please contact support.')
      }

      setInvitation(invitationData)

    } catch (error) {
      console.error('Token validation error:', error)
      setTokenError(error instanceof Error ? error.message : 'Invalid invitation')
    } finally {
      setValidatingToken(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    
    if (!invitation || !token) {
      toast({
        title: 'Error',
        description: 'Invalid invitation',
        variant: 'destructive'
      })
      return
    }

    // Validate password
    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive'
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both password fields match',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.users.email,
        password: password,
        options: {
          data: {
            name: invitation.users.name,
            invitation_token: token
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Update user record to link with auth user and set status to ACTIVE
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          auth_user_id: authData.user.id,
          status: 'ACTIVE',
          activated_at: new Date().toISOString()
        })
        .eq('id', invitation.users.id)

      if (updateError) {
        throw updateError
      }

      // Update invitation status to USED
      await supabase
        .from('invitations')
        .update({ 
          status: 'USED',
          used_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      // Create audit log
      await supabase.rpc('create_audit_log', {
        p_user_id: authData.user.id,
        p_action: 'USER_SIGNUP_COMPLETED',
        p_entity: 'USER',
        p_entity_id: invitation.users.id,
        p_metadata: {
          email: invitation.users.email,
          invitation_token: token,
          signup_method: 'invitation'
        }
      })

      toast({
        title: 'Account created successfully!',
        description: 'You can now sign in to your account.'
      })

      // Redirect to login or dashboard
      router.push('/login?message=Account created successfully. Please sign in.')

    } catch (error) {
      console.error('Signup error:', error)
      toast({
        title: 'Signup failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function getPasswordStrength(password: string) {
    if (password.length === 0) return { strength: 0, label: '', color: '' }
    if (password.length < 6) return { strength: 1, label: 'Weak', color: 'text-red-500' }
    if (password.length < 10) return { strength: 2, label: 'Fair', color: 'text-yellow-500' }
    if (password.length < 12) return { strength: 3, label: 'Good', color: 'text-blue-500' }
    return { strength: 4, label: 'Strong', color: 'text-green-500' }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword && password === confirmPassword

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600 flex items-center justify-center">
              <XCircle className="h-6 w-6 mr-2" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {tokenError || 'This invitation link is not valid'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Please check your email for the correct invitation link, or contact support if you continue to have issues.
            </p>
            <div className="flex space-x-3 justify-center">
              <Link href="/request">
                <Button variant="outline">Request New Account</Button>
              </Link>
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
            Complete Your Setup
          </CardTitle>
          <CardDescription>
            Welcome {invitation.users.name || invitation.users.email}! 
            Create your password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={invitation.users.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Create Password <span className="text-red-500">*</span>
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {password && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="flex-1 bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all ${
                        passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                        passwordStrength.strength === 2 ? 'bg-yellow-500 w-2/4' :
                        passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                        passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                      }`}
                    />
                  </div>
                  <span className={passwordStrength.color}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && (
                <div className="flex items-center space-x-1 text-sm">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your password must be at least 8 characters long and should include a mix of letters, numbers, and special characters for security.
              </AlertDescription>
            </Alert>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={loading || !password || !confirmPassword || !passwordsMatch || passwordStrength.strength < 2} 
                className="w-full"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Already have an account?</p>
            <Link href="/login" className="text-blue-600 hover:text-blue-800">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}