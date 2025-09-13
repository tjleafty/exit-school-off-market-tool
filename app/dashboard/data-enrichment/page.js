'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function DataEnrichmentPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(null)
  const [user, setUser] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)

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
                          <button 
                            onClick={() => setSelectedCompany(company)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                          >
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

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{selectedCompany.name}</h3>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Company Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">Basic Information</h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div><strong>Address:</strong> {selectedCompany.formatted_address || selectedCompany.location || 'Not available'}</div>
                      <div><strong>Phone:</strong> {selectedCompany.phone || selectedCompany.formatted_phone_number || 'Not available'}</div>
                      <div><strong>Website:</strong> {selectedCompany.website ? (
                        <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedCompany.website}
                        </a>
                      ) : 'Not available'}</div>
                      <div><strong>Industry:</strong> {selectedCompany.industry || 'Not specified'}</div>
                      <div><strong>Rating:</strong> {selectedCompany.rating ? `${selectedCompany.rating}/5.0 (${selectedCompany.user_ratings_total || 0} reviews)` : 'No rating'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700">Enrichment Data</h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div><strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-1 text-xs rounded ${selectedCompany.is_enriched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {selectedCompany.is_enriched ? 'Enriched' : 'Pending'}
                        </span>
                      </div>
                      {selectedCompany.is_enriched && (
                        <>
                          <div><strong>Email:</strong> {selectedCompany.email || 'Not found'} 
                            {selectedCompany.email_confidence && (
                              <span className={`ml-1 px-1 py-0.5 text-xs rounded ${selectedCompany.email_confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {selectedCompany.email_confidence}
                              </span>
                            )}
                          </div>
                          <div><strong>Owner:</strong> {selectedCompany.owner_name || 'Not identified'}</div>
                          <div><strong>Employee Count:</strong> {selectedCompany.employee_count || 'Not available'} {selectedCompany.employees_range && `(${selectedCompany.employees_range})`}</div>
                          <div><strong>Revenue:</strong> {selectedCompany.revenue ? `$${selectedCompany.revenue.toLocaleString()}` : 'Not available'} {selectedCompany.revenue_range && `(${selectedCompany.revenue_range})`}</div>
                          <div><strong>Enriched At:</strong> {selectedCompany.enriched_at ? new Date(selectedCompany.enriched_at).toLocaleString() : 'Not available'}</div>
                          <div><strong>Source:</strong> {selectedCompany.enrichment_source || 'Not specified'}</div>
                        </>
                      )}
                      <div><strong>Created:</strong> {new Date(selectedCompany.created_at).toLocaleString()}</div>
                      <div><strong>Updated:</strong> {new Date(selectedCompany.updated_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Google Places Data */}
                {selectedCompany.place_id && (
                  <div>
                    <h4 className="font-semibold text-gray-700">Google Places Data</h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div><strong>Place ID:</strong> {selectedCompany.place_id}</div>
                      {selectedCompany.types && (
                        <div><strong>Categories:</strong> {selectedCompany.types}</div>
                      )}
                      {selectedCompany.business_status && (
                        <div><strong>Business Status:</strong> {selectedCompany.business_status}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Raw Data (for debugging) */}
                <div>
                  <h4 className="font-semibold text-gray-700">Technical Details</h4>
                  <div className="mt-2 text-xs">
                    <div><strong>Company ID:</strong> {selectedCompany.id}</div>
                    <div><strong>Search ID:</strong> {selectedCompany.search_id || 'Not linked'}</div>
                    <div><strong>User ID:</strong> {selectedCompany.user_id || 'Not specified'}</div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}