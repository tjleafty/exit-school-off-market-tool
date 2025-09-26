'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    console.log('Exit School Authentication System - Deploying Now!')
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Exit School Off-Market Tool
          </h1>
          <p className="text-gray-600 mb-8">
            B2B Intelligence Platform - Authentication System Live!
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/login"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors inline-block"
          >
            Sign In
          </Link>
          
          <Link 
            href="/signup"
            className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors inline-block"
          >
            Request Access
          </Link>
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>Features:</p>
          <ul className="text-xs space-y-1">
            <li>• Company Discovery & Intelligence</li>
            <li>• Multi-source Data Enrichment</li>
            <li>• AI-Generated Reports</li>
            <li>• Email Automation</li>
          </ul>
        </div>
      </div>
    </main>
  )
}