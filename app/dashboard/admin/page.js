'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const [advancedFilterEnabled, setAdvancedFilterEnabled] = useState(false)

  // Load advanced filter setting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSetting = localStorage.getItem('advancedFilterEnabled')
      setAdvancedFilterEnabled(savedSetting === 'true')
    }
  }, [])

  // Save advanced filter setting to localStorage
  const handleAdvancedFilterToggle = (enabled) => {
    setAdvancedFilterEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('advancedFilterEnabled', enabled.toString())
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Administrator
              </span>
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Administrator Control Panel</h2>
            <p className="text-gray-600">Manage users, monitor system activity, and oversee platform operations</p>
          </div>

          {/* Admin-specific features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/dashboard/admin/users" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">User Management</dt>
                      <dd className="text-lg font-medium text-gray-900">Manage Users</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/analytics" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Search Analytics</dt>
                      <dd className="text-lg font-medium text-gray-900">User Activity</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/settings" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⚙️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">System Settings</dt>
                      <dd className="text-lg font-medium text-gray-900">Configuration</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/report-settings" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📋</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Report Settings</dt>
                      <dd className="text-lg font-medium text-gray-900">AI Prompts</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature Toggles */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Settings</h3>
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Advanced Search Filters</h4>
                    <p className="text-sm text-gray-500">Show advanced filtering options in Company Discovery search</p>
                  </div>
                  <button
                    onClick={() => handleAdvancedFilterToggle(!advancedFilterEnabled)}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      advancedFilterEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className="sr-only">Toggle advanced filters</span>
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        advancedFilterEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Status: <span className={advancedFilterEnabled ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {advancedFilterEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {advancedFilterEnabled && <span className="ml-2">- Users can see advanced filter options</span>}
                  {!advancedFilterEnabled && <span className="ml-2">- Advanced filters are hidden from users</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Shared features */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Features</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/dashboard/company-discovery" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔍</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Company Discovery</dt>
                      <dd className="text-lg font-medium text-gray-900">Search & Find</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/data-enrichment" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Data Enrichment</dt>
                      <dd className="text-lg font-medium text-gray-900">Enhance Data</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}