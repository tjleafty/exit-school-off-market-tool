'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function CompanyDiscoveryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [savedLists, setSavedLists] = useState([])
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [user, setUser] = useState(null)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)
  
  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    employeesRange: '',
    revenueRange: '',
    stage: ''
  })

  // Load user info
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleSearch = async (isNewSearch = true) => {
    if (!searchTerm.trim() && !Object.values(filters).some(f => f)) {
      alert('Please enter search terms or apply filters')
      return
    }
    
    if (isNewSearch) {
      setIsSearching(true)
      setResults([])
      setCurrentPage(1)
      setNextPageToken(null)
    }
    
    try {
      const response = await fetch('/api/companies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchTerm,
          filters: filters,
          userId: user?.id,
          page: isNewSearch ? 1 : currentPage,
          limit: 20,
          nextPageToken: isNewSearch ? null : nextPageToken
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const newCompanies = data.companies || []
        
        if (isNewSearch) {
          setResults(newCompanies)
        } else {
          // Append new results, filtering out duplicates
          setResults(prev => {
            const existingIds = new Set(prev.map(c => c.id))
            const uniqueNewCompanies = newCompanies.filter(c => !existingIds.has(c.id))
            return [...prev, ...uniqueNewCompanies]
          })
        }
        
        setHasMoreResults(data.hasMoreResults || false)
        setNextPageToken(data.nextPageToken || null)
        
        if (newCompanies.length === 0 && isNewSearch) {
          alert('No companies found. Try different search terms.')
        }
      } else {
        console.error('Search failed:', data.error)
        alert('Search failed. Please try again.')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      if (isNewSearch) {
        setIsSearching(false)
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreResults) return
    
    setIsLoadingMore(true)
    setCurrentPage(prev => prev + 1)
    
    try {
      await handleSearch(false)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      industry: '',
      location: '',
      employeesRange: '',
      revenueRange: '',
      stage: ''
    })
  }

  const toggleCompanySelection = (companyId) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const getUserRole = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user.role
    }
    return 'USER'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link 
                href={getUserRole() === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user'} 
                className="text-blue-600 hover:text-blue-500 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Company Discovery</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getUserRole() === 'ADMIN' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getUserRole() === 'ADMIN' ? 'Administrator' : 'User'}
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
            <h2 className="text-2xl font-bold text-gray-900">Company Discovery</h2>
            <p className="text-gray-600">Search and discover off-market companies for acquisition opportunities</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="space-y-4">
              {/* Primary Search Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g., Technology, Healthcare, Manufacturing"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g., San Francisco, New York"
                    value={filters.city || ''}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g., CA, NY, TX"
                    value={filters.state || ''}
                    onChange={(e) => setFilters({...filters, state: e.target.value})}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Search Controls */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Advanced Filters {showFilters ? '▲' : '▼'}
                </button>
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters({
                      industry: '',
                      location: '',
                      city: '',
                      state: '',
                      employeesRange: '',
                      revenueRange: '',
                      stage: ''
                    })
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <select
                      value={filters.industry}
                      onChange={(e) => setFilters({...filters, industry: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Industries</option>
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Retail">Retail</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Education">Education</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Logistics">Logistics</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="City, State, or Country"
                      value={filters.location}
                      onChange={(e) => setFilters({...filters, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <select
                      value={filters.employeesRange}
                      onChange={(e) => setFilters({...filters, employeesRange: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Sizes</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Revenue</label>
                    <select
                      value={filters.revenueRange}
                      onChange={(e) => setFilters({...filters, revenueRange: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Revenues</option>
                      <option value="<$1M">Less than $1M</option>
                      <option value="$1M-$10M">$1M - $10M</option>
                      <option value="$10M-$50M">$10M - $50M</option>
                      <option value="$50M-$100M">$50M - $100M</option>
                      <option value="$100M+">$100M+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <select
                      value={filters.stage}
                      onChange={(e) => setFilters({...filters, stage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Stages</option>
                      <option value="Startup">Startup</option>
                      <option value="Growth">Growth</option>
                      <option value="Mature">Mature</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="col-span-full">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Search Results {results.length > 0 && `(${results.length})`}
                </h3>
                {selectedCompanies.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedCompanies.length} companies selected
                  </p>
                )}
              </div>
              {selectedCompanies.length > 0 && (
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    Export Selected
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                    Add to List
                  </button>
                </div>
              )}
            </div>
            
            {results.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {results.map((company) => (
                  <li key={company.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={() => toggleCompanySelection(company.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-600">
                              {company.industry || 'Industry N/A'} • {company.location || 'Location N/A'}
                            </p>
                            {company.description && (
                              <p className="text-sm text-gray-500 mt-1">{company.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>👥 {company.employees_range || 'N/A'}</span>
                              <span>💰 {company.revenue_range || 'N/A'}</span>
                              <span>📈 {company.company_stage || 'N/A'}</span>
                              {company.founded_year && <span>📅 Founded {company.founded_year}</span>}
                              {company.website && (
                                <a 
                                  href={company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-500"
                                >
                                  🌐 Website
                                </a>
                              )}
                              {company.linkedin_url && (
                                <a 
                                  href={company.linkedin_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-500"
                                >
                                  💼 LinkedIn
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <button className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700">
                              View Details
                            </button>
                            <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
                              Enrich Data
                            </button>
                            {company.is_enriched && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded text-center">
                                ✓ Enriched
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
                <p className="text-gray-600">
                  Enter search terms or use filters to discover companies for acquisition opportunities.
                </p>
                <div className="mt-6 text-sm text-gray-500">
                  <p>Try searching for:</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <button 
                      onClick={() => { setSearchTerm('technology'); handleSearch(); }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Technology
                    </button>
                    <button 
                      onClick={() => { setSearchTerm('healthcare'); handleSearch(); }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Healthcare
                    </button>
                    <button 
                      onClick={() => { setSearchTerm('manufacturing'); handleSearch(); }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Manufacturing
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Load More Button */}
            {results.length > 0 && hasMoreResults && (
              <div className="px-6 py-6 border-t border-gray-200 text-center bg-gray-50">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading More...' : 'Load More Results'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Showing {results.length} companies. Click to load more from Google Places API.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}