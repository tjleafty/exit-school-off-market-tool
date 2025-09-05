'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import Link from 'next/link'

type Supabase = Database

export default function RequestAccountPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClientComponentClient<Supabase>()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .single()

      if (existingUser) {
        if (existingUser.status === 'REQUESTED') {
          throw new Error('Your request is already pending approval')
        } else if (existingUser.status === 'APPROVED') {
          throw new Error('Your account has been approved. Please check your email for login instructions')
        } else if (existingUser.status === 'ACTIVE') {
          throw new Error('You already have an active account. Please sign in')
        } else {
          throw new Error('There is an issue with your account. Please contact support')
        }
      }

      // Create user record with REQUESTED status
      const { error } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: name.trim() || null,
          company_name: company.trim() || null,
          status: 'REQUESTED',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Database error:', error)
        throw new Error('Failed to submit request. Please try again.')
      }

      // Create audit log
      await supabase.rpc('create_audit_log', {
        p_user_id: null,
        p_action: 'ACCOUNT_REQUESTED',
        p_entity: 'USER',
        p_entity_id: null,
        p_metadata: {
          email: email.toLowerCase(),
          name: name.trim() || null,
          company_name: company.trim() || null,
          ip_address: 'unknown', // Could be enhanced with IP detection
          user_agent: navigator.userAgent
        }
      })

      setSubmitted(true)

      toast({
        title: 'Request submitted successfully',
        description: 'An admin will review your request and send you login instructions via email.'
      })

    } catch (error) {
      console.error('Request error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Request Submitted</CardTitle>
            <CardDescription>
              Thank you for your interest in Exit School Off-Market Tool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">
              Your account request has been submitted and is pending admin approval.
            </p>
            <p className="text-sm text-gray-500">
              You will receive an email with login instructions once your account is approved.
            </p>
            <div className="pt-4">
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
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
          <CardTitle>Request Account Access</CardTitle>
          <CardDescription>
            Submit a request to access the Exit School Off-Market Tool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Your Company Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
                autoComplete="organization"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={loading || !email} 
                className="w-full"
              >
                {loading ? 'Submitting Request...' : 'Request Access'}
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