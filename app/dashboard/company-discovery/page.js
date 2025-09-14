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
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('USER')
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [advancedFilterEnabled, setAdvancedFilterEnabled] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [lastSearchQuery, setLastSearchQuery] = useState(null)
  
  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    employeesRange: '',
    revenueRange: '',
    stage: ''
  })
  
  const [enrichingCompany, setEnrichingCompany] = useState(null)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null)

  // Helper function to generate Google listing URL
  const getGoogleListingUrl = (placeId) => {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`
  }

  // Load user info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)
        setUserRole(userData.role || 'USER')
      }
      
      // Load advanced filter setting
      const advancedFilterSetting = localStorage.getItem('advancedFilterEnabled')
      setAdvancedFilterEnabled(advancedFilterSetting === 'true')
    }
  }, [])

  const handleSearch = async (isNewSearch = true) => {
    let searchQuery, location
    
    if (isNewSearch) {
      // Build new search query from current filters
      searchQuery = []
      if (searchTerm) searchQuery.push(searchTerm)
      if (filters.industry) searchQuery.push(filters.industry)
      
      location = []
      if (filters.city) location.push(filters.city)
      if (filters.state) location.push(filters.state)
      
      if (searchQuery.length === 0 && location.length === 0) {
        alert('Please enter search terms or location')
        return
      }
      
      // Save search query for pagination
      setLastSearchQuery({
        query: searchQuery.join(' '),
        location: location.join(', ')
      })
      
      setIsSearching(true)
      setResults([])
      setCurrentPage(1)
      setNextPageToken(null)
    } else {
      // Use saved search query for pagination
      if (!lastSearchQuery) {
        console.error('No saved search query for pagination')
        return
      }
      searchQuery = lastSearchQuery.query
      location = lastSearchQuery.location
    }
    
    try {
      // Call the secure Google Places API endpoint
      const requestBody = {
        query: searchQuery,
        location: location,
        type: 'establishment'
      }
      
      // Add page token for pagination
      if (!isNewSearch && nextPageToken) {
        requestBody.pagetoken = nextPageToken
        console.log('Loading more with page token:', nextPageToken)
      }
      
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Search failed:', data.error)
        alert(data.error || 'Search failed. Please try again.')
        return
      }
      
      if (data.status === 'OK' && data.results) {
        const newCompanies = data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          location: place.formatted_address,
          address: place.formatted_address,
          city: place.formatted_address?.split(',')[1]?.trim() || '',
          state: place.formatted_address?.split(',')[2]?.trim()?.split(' ')[0] || '',
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          types: place.types,
          industry: place.types?.[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Business',
          website: place.website,
          phone: place.formatted_phone_number,
          is_enriched: !!place.website,
          geometry: place.geometry
        }))
        
        if (isNewSearch) {
          setResults(newCompanies)
          // Reset selection state for new search
          setSelectedCompanies([])
          setSelectAllChecked(false)
        } else {
          // Append new results, filtering out duplicates
          setResults(prev => {
            const existingIds = new Set(prev.map(c => c.id))
            const uniqueNewCompanies = newCompanies.filter(c => !existingIds.has(c.id))
            return [...prev, ...uniqueNewCompanies]
          })
        }
        
        // Google Places returns max 20 results per page, check for next_page_token
        setHasMoreResults(!!data.next_page_token)
        setNextPageToken(data.next_page_token || null)
        
        if (newCompanies.length === 0 && isNewSearch) {
          alert('No businesses found. Try different search terms.')
        }
      } else if (data.status === 'ZERO_RESULTS') {
        if (isNewSearch) {
          setResults([])
          alert('No businesses found. Try different search terms.')
        }
      } else {
        console.error('Search error:', data.status, data.error_message)
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
    setSelectedCompanies(prev => {
      const newSelection = prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
      
      // Update select all checkbox state
      setSelectAllChecked(newSelection.length === results.length && results.length > 0)
      
      return newSelection
    })
  }

  const handleSelectAll = () => {
    if (selectAllChecked) {
      // Deselect all
      setSelectedCompanies([])
      setSelectAllChecked(false)
    } else {
      // Select all
      const allIds = results.map(company => company.id)
      setSelectedCompanies(allIds)
      setSelectAllChecked(true)
    }
  }

  const addToList = async () => {
    const selectedData = results.filter(company => 
      selectedCompanies.includes(company.id)
    )
    
    if (selectedData.length === 0) {
      alert('No companies selected')
      return
    }
    
    try {
      console.log('About to call save API with:', selectedData.length, 'companies')
      console.log('First company:', selectedData[0])
      
      const response = await fetch('/api/companies/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: selectedData,
          userId: user?.id,
          searchName: `${searchTerm || 'Companies'} - ${filters.city || filters.state || 'Search'} - ${new Date().toLocaleDateString()}`,
          industry: searchTerm || 'General',
          city: filters.city || 'Unknown',
          state: filters.state || 'Unknown'
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response OK:', response.ok)

      const result = await response.json()
      
      if (result.success) {
        alert(result.message)
        // Clear selection after successful save
        setSelectedCompanies([])
        // Mark saved companies as added to list
        setResults(prev => 
          prev.map(company => {
            if (selectedCompanies.includes(company.id)) {
              return { ...company, addedToList: true }
            }
            return company
          })
        )
      } else {
        console.error('Failed to save companies:', result.error)
        alert('Failed to add companies to list. Please try again.')
      }
    } catch (error) {
      console.error('Error adding companies to list:', error)
      alert('Error adding companies to list. Please try again.')
    }
  }

  const exportSelected = () => {
    const selectedData = results.filter(company => 
      selectedCompanies.includes(company.id)
    )
    
    if (selectedData.length === 0) {
      alert('No companies selected for export')
      return
    }
    
    // Convert to CSV
    const headers = ['Name', 'Address', 'City', 'State', 'Industry', 'Phone', 'Website', 'Google Rating', 'Review Count']
    const csvContent = [
      headers.join(','),
      ...selectedData.map(company => [
        `"${company.name || ''}"`,
        `"${company.address || ''}"`,
        `"${company.city || ''}"`,
        `"${company.state || ''}"`,
        `"${company.industry || ''}"`,
        `"${company.phone || ''}"`,
        `"${company.website || ''}"`,
        company.rating ? company.rating.toFixed(1) : '',
        company.user_ratings_total || ''
      ].join(','))
    ].join('\n')
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert(`Exported ${selectedData.length} companies successfully!`)
  }

  const enrichCompany = async (company) => {
    try {
      setEnrichingCompany(company.place_id || company.id)
      
      const response = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyData: {
            ...company,
            place_id: company.place_id,
            name: company.name,
            formatted_address: company.formatted_address || company.location,
            types: company.types,
            geometry: company.geometry,
            rating: company.rating,
            user_ratings_total: company.user_ratings_total,
            website: company.website
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Update the company in results to show it's enriched
        setResults(prev => 
          prev.map(c => 
            (c.place_id === company.place_id || c.id === company.id) 
              ? { ...c, is_enriched: true, ...result.data }
              : c
          )
        )
        alert('Company data enriched successfully!')
      } else {
        console.error('Enrichment failed:', result.error)
        alert('Failed to enrich company data. Please try again.')
      }
    } catch (error) {
      console.error('Error enriching company:', error)
      alert('Error enriching company data. Please try again.')
    } finally {
      setEnrichingCompany(null)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link 
                href={userRole === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user'} 
                className="text-blue-600 hover:text-blue-500 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Company Discovery</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                userRole === 'ADMIN' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {userRole === 'ADMIN' ? 'Administrator' : 'User'}
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
                {advancedFilterEnabled && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Advanced Filters {showFilters ? '▲' : '▼'}
                  </button>
                )}
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
              {advancedFilterEnabled && showFilters && (
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
                  <button 
                    onClick={exportSelected}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    Export Selected ({selectedCompanies.length})
                  </button>
                  <button 
                    onClick={addToList}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Add to List ({selectedCompanies.length})
                  </button>
                </div>
              )}
            </div>

            {/* Select All Header - only show if there are results */}
            {results.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="select-all-results"
                      checked={selectAllChecked}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="select-all-results" className="ml-2 text-sm font-medium text-gray-700">
                      {selectAllChecked ? 'Deselect All' : 'Select All'} ({results.length} companies)
                    </label>
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedCompanies.length > 0 && `${selectedCompanies.length} selected`}
                  </div>
                </div>
              </div>
            )}
            
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
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                              {company.addedToList && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                  ✓ In List
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {company.industry || 'Industry N/A'} • {company.location || 'Location N/A'}
                            </p>
                            {company.description && (
                              <p className="text-sm text-gray-500 mt-1">{company.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                              {/* Google Reviews Section - Most Important */}
                              {company.rating && (
                                <span className="flex items-center gap-1 font-medium text-amber-600">
                                  ⭐ {company.rating.toFixed(1)}
                                  {company.user_ratings_total && (
                                    <span className="text-gray-500">({company.user_ratings_total} reviews)</span>
                                  )}
                                </span>
                              )}
                              
                              {/* Other Company Details */}
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
                              {company.place_id && (
                                <a 
                                  href={getGoogleListingUrl(company.place_id)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-red-600 hover:text-red-500"
                                >
                                  📍 Google Listing
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
                            <button 
                              onClick={() => setSelectedCompanyDetails(company)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                            >
                              View Details
                            </button>
                            <button 
                              onClick={() => enrichCompany(company)}
                              disabled={enrichingCompany === (company.place_id || company.id) || company.is_enriched}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {enrichingCompany === (company.place_id || company.id) ? 'Enriching...' : 
                               company.is_enriched ? 'Enriched' : 'Enrich Data'}
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

      {/* Company Details Modal */}
      {selectedCompanyDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Company Details
                </h3>
                <button
                  onClick={() => setSelectedCompanyDetails(null)}
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
                    <h4 className="font-semibold text-gray-700 mb-3">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedCompanyDetails.name}</div>
                      <div><strong>Address:</strong> {selectedCompanyDetails.formatted_address || selectedCompanyDetails.vicinity || 'Not available'}</div>
                      <div><strong>Phone:</strong> {selectedCompanyDetails.formatted_phone_number || selectedCompanyDetails.phone || 'Not available'}</div>
                      <div><strong>Website:</strong> {selectedCompanyDetails.website ? (
                        <a href={selectedCompanyDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedCompanyDetails.website}
                        </a>
                      ) : 'Not available'}</div>
                      <div><strong>Rating:</strong> {selectedCompanyDetails.rating ? `${selectedCompanyDetails.rating}/5.0 (${selectedCompanyDetails.user_ratings_total || 0} reviews)` : 'No rating'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Business Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-1 text-xs rounded ${selectedCompanyDetails.is_enriched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {selectedCompanyDetails.is_enriched ? 'Enriched' : 'Basic Info Only'}
                        </span>
                      </div>
                      <div><strong>Business Status:</strong> {selectedCompanyDetails.business_status || 'Not specified'}</div>
                      <div><strong>Price Level:</strong> {selectedCompanyDetails.price_level ? '$'.repeat(selectedCompanyDetails.price_level) : 'Not specified'}</div>
                      <div><strong>Place ID:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{selectedCompanyDetails.place_id}</code></div>
                    </div>
                  </div>
                </div>

                {/* Categories/Types */}
                {selectedCompanyDetails.types && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedCompanyDetails.types.map((type, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opening Hours */}
                {selectedCompanyDetails.opening_hours && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Opening Hours</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Open Now:</strong> 
                        <span className={`ml-1 px-2 py-1 text-xs rounded ${selectedCompanyDetails.opening_hours.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {selectedCompanyDetails.opening_hours.open_now ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {selectedCompanyDetails.opening_hours.weekday_text && (
                        <div>
                          <strong>Hours:</strong>
                          <ul className="mt-1 ml-4 text-xs space-y-0.5">
                            {selectedCompanyDetails.opening_hours.weekday_text.map((hours, index) => (
                              <li key={index}>{hours}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {selectedCompanyDetails.photos && selectedCompanyDetails.photos.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Photos</h4>
                    <div className="flex space-x-2 overflow-x-auto">
                      {selectedCompanyDetails.photos.slice(0, 3).map((photo, index) => (
                        <img 
                          key={index}
                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`}
                          alt={`${selectedCompanyDetails.name} photo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setSelectedCompanyDetails(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <div className="flex space-x-2">
                  {selectedCompanyDetails.website && (
                    <a
                      href={selectedCompanyDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Visit Website
                    </a>
                  )}
                  {selectedCompanyDetails.place_id && (
                    <a
                      href={getGoogleListingUrl(selectedCompanyDetails.place_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      📍 Google Listing
                    </a>
                  )}
                  <button
                    onClick={() => enrichCompany(selectedCompanyDetails)}
                    disabled={enrichingCompany === (selectedCompanyDetails.place_id || selectedCompanyDetails.id) || selectedCompanyDetails.is_enriched}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedCompanyDetails.is_enriched ? 'Already Enriched' : 'Enrich Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}