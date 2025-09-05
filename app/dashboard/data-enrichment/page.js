'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function DataEnrichmentPage() {
  const [companies] = useState([
    {
      id: 1,
      name: 'TechStart Inc.',
      email: 'contact@techstart.com',
      phone: '+1 (555) 123-4567',
      website: 'www.techstart.com',
      enriched: true,
      lastUpdated: '2025-01-05'
    },
    {
      id: 2,
      name: 'DataFlow Solutions',
      email: 'info@dataflow.com',
      phone: 'Not found',
      website: 'www.dataflow.com',
      enriched: false,
      lastUpdated: '2025-01-03'
    }
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Data Enrichment</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Admin
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
            <h2 className="text-2xl font-bold text-gray-900">Data Enrichment</h2>
            <p className="text-gray-600">Enhance company data with additional contact information and insights</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
                      <dd className="text-lg font-medium text-gray-900">{companies.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Enriched</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {companies.filter(c => c.enriched).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {companies.filter(c => !c.enriched).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Company Data</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and enrich your company database</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Enrich All
              </button>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {companies.map((company) => (
                <li key={company.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          company.enriched 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {company.enriched ? 'Enriched' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>📧 {company.email}</div>
                        <div>📞 {company.phone}</div>
                        <div>🌐 {company.website}</div>
                        <div>📅 Updated: {company.lastUpdated}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!company.enriched && (
                        <button className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700">
                          Enrich Now
                        </button>
                      )}
                      <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
                        View Details
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}