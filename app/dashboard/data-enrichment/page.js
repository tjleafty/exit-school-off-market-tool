'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function DataEnrichmentPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(null)
  const [user, setUser] = useState(null)

  // Load user from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)
      }
    }
  }, [])

  // Load companies from database on mount
  useEffect(() => {
    if (user?.id) {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      console.log('Loading companies from database...')
      const response = await fetch(`/api/companies/list?userId=${user?.id}`)
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        console.log('Found companies:', data.companies?.length || 0)
        setCompanies(data.companies || [])
      } else {
        console.error('Failed to load companies:', data.error)
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const enrichCompany = async (company) => {
    try {
      setEnriching(company.id)
      
      const payload = {
        companyId: company.id,
        companyData: company
      }
      console.log('Enrichment request payload:', payload)
      
      const response = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Enrichment response status:', response.status)
      const result = await response.json()
      console.log('Enrichment response body:', result)
      
      if (result.success) {
        // Update the company in the list
        setCompanies(prev => 
          prev.map(c => c.id === company.id ? result.data : c)
        )
        console.log('Company enriched successfully:', result.data)
      } else {
        console.error('Enrichment failed:', result.error)
        console.error('Full error response:', result)
        alert('Failed to enrich company data. Please try again.')
      }
    } catch (error) {
      console.error('Error enriching company:', error)
      alert('Error enriching company data. Please try again.')
    } finally {
      setEnriching(null)
    }
  }

  const enrichAll = async () => {
    const unenrichedCompanies = companies.filter(c => !c.is_enriched)
    
    if (unenrichedCompanies.length === 0) {
      alert('All companies are already enriched!')
      return
    }

    if (!confirm(`Enrich ${unenrichedCompanies.length} companies?`)) {
      return
    }

    for (const company of unenrichedCompanies) {
      await enrichCompany(company)
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const generateBIReport = async (company) => {
    try {
      setGeneratingReport(company.id)
      
      const response = await fetch('/api/companies/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          tier: 'BI',
          userId: user?.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Update the company to show it has a report
        setCompanies(prev => 
          prev.map(c => c.id === company.id ? { ...c, has_bi_report: true, is_enriched: true } : c)
        )
        alert(`${result.message}\n\nThe BI report includes automatic data enrichment.`)
      } else {
        console.error('BI Report generation failed:', result.error)
        alert('Failed to generate Business Intelligence report. Please try again.')
      }
    } catch (error) {
      console.error('Error generating BI report:', error)
      alert('Error generating Business Intelligence report. Please try again.')
    } finally {
      setGeneratingReport(null)
    }
  }

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
            <h2 className="text-2xl font-bold text-gray-900">Data Enrichment & Business Intelligence</h2>
            <p className="text-gray-600">Enhance company data or generate comprehensive business intelligence reports</p>
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <strong>Two Options:</strong> 
              <span className="ml-2"><strong>Enrich Data</strong> - Add contact info and basic details</span>
              <span className="ml-4"><strong>Generate BI Report</strong> - Comprehensive analysis (includes enrichment)</span>
            </div>
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
                        {companies.filter(c => c.is_enriched).length}
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
                        {companies.filter(c => !c.is_enriched).length}
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
              <button 
                onClick={enrichAll}
                disabled={loading || companies.filter(c => !c.is_enriched).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Enrich All'}
              </button>
            </div>
            
            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4 animate-pulse">⏳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Companies...</h3>
              </div>
            ) : companies.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <li key={company.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            company.is_enriched 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {company.is_enriched ? 'Enriched' : 'Pending'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>📧 {company.email || 'No email'}</div>
                          <div>📞 {company.phone || company.formatted_phone_number || 'No phone'}</div>
                          <div>🌐 {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {new URL(company.website).hostname}
                            </a>
                          ) : 'No website'}</div>
                          <div>📅 Updated: {company.updated_at ? new Date(company.updated_at).toLocaleDateString() : 'Never'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          {!company.is_enriched && (
                            <button 
                              onClick={() => enrichCompany(company)}
                              disabled={enriching === company.id}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {enriching === company.id ? 'Enriching...' : 'Enrich Data'}
                            </button>
                          )}
                          <button 
                            onClick={() => generateBIReport(company)}
                            disabled={generatingReport === company.id}
                            className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {generatingReport === company.id ? 'Generating...' : 'Generate BI Report'}
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
                            View Details
                          </button>
                          {company.has_bi_report && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                              ✓ BI Report Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data to Enrich</h3>
                <p className="text-gray-600">Companies discovered through search will appear here for data enrichment.</p>
                <Link 
                  href="/dashboard/company-discovery"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Discover Companies
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}