'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // In a real app, you'd check the user's role from auth context/API
    // For demo, we'll assume admin since that's our test account
    const userRole = 'ADMIN' // This would come from auth context
    
    if (userRole === 'ADMIN') {
      router.push('/dashboard/admin')
    } else {
      router.push('/dashboard/user')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}