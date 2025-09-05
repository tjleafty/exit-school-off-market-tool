'use client'

import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Request Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Get access to the Exit School platform
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Access to this platform is by invitation only. 
            </p>
            <p className="text-gray-600 mb-6">
              Please contact your administrator to request access.
            </p>
            
            <Link 
              href="/"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}