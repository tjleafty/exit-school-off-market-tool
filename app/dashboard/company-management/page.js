'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function CompanyManagementPage() {
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSearchCompanies, setSelectedSearchCompanies] = useState([])
  const [selectAllSearchChecked, setSelectAllSearchChecked] = useState(false)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [lastSearchQuery, setLastSearchQuery] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Enrichment state
  const [savedCompanies, setSavedCompanies] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  // Removed duplicate enriching state - using enrichingCompany instead
  // Removed generatingReport state - not used in combined dashboard
  const [selectedSavedCompanies, setSelectedSavedCompanies] = useState(new Set())
  const [selectAllSavedChecked, setSelectAllSavedChecked] = useState(false)
  const [historicalCompanies, setHistoricalCompanies] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null)

  // Shared state
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('USER')
  const [advancedFilterEnabled, setAdvancedFilterEnabled] = useState(false)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null)
  const [enrichingCompany, setEnrichingCompany] = useState(null)
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingTXT, setExportingTXT] = useState(false)
  const [activeTab, setActiveTab] = useState('search') // 'search' or 'manage'

  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    city: '',
    state: '',
    employeesRange: '',
    revenueRange: '',
    stage: ''
  })

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

  // Load saved companies
  useEffect(() => {
    if (user?.id) {
      loadSavedCompanies()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedCompanies = async () => {
    try {
      setLoadingSaved(true)
      console.log('Loading saved companies from database...')
      const response = await fetch(`/api/companies/list?userId=${user?.id}`)

      const data = await response.json()

      if (data.success) {
        // Separate today's companies from historical ones
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todaysCompanies = []
        const historicalCompanies = []

        data.companies.forEach(company => {
          const companyDate = new Date(company.created_at)
          companyDate.setHours(0, 0, 0, 0)

          if (companyDate.getTime() === today.getTime()) {
            todaysCompanies.push(company)
          } else {
            historicalCompanies.push(company)
          }
        })

        setSavedCompanies(todaysCompanies)
        setHistoricalCompanies(historicalCompanies)
      } else {
        console.error('Failed to load saved companies:', data.error)
      }
    } catch (error) {
      console.error('Error loading saved companies:', error)
    } finally {
      setLoadingSaved(false)
    }
  }

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
      setSearchResults([])
      setCurrentPage(1)
      setNextPageToken(null)
      setActiveTab('search') // Switch to search tab when searching
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
          is_enriched: false, // Companies from search are not enriched yet
          geometry: place.geometry,
          place_id: place.place_id
        }))

        if (isNewSearch) {
          setSearchResults(newCompanies)
          // Reset selection state for new search
          setSelectedSearchCompanies([])
          setSelectAllSearchChecked(false)
        } else {
          // Append new results, filtering out duplicates
          setSearchResults(prev => {
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
          setSearchResults([])
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

  // Search results selection functions
  const toggleSearchCompanySelection = (companyId) => {
    setSelectedSearchCompanies(prev => {
      const newSelection = prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]

      // Update select all checkbox state
      setSelectAllSearchChecked(newSelection.length === searchResults.length && searchResults.length > 0)

      return newSelection
    })
  }

  const handleSelectAllSearch = () => {
    if (selectAllSearchChecked) {
      // Deselect all
      setSelectedSearchCompanies([])
      setSelectAllSearchChecked(false)
    } else {
      // Select all
      const allIds = searchResults.map(company => company.id)
      setSelectedSearchCompanies(allIds)
      setSelectAllSearchChecked(true)
    }
  }

  // Saved companies selection functions
  const handleSelectSavedCompany = (companyId) => {
    const newSelected = new Set(selectedSavedCompanies)
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId)
    } else {
      newSelected.add(companyId)
    }
    setSelectedSavedCompanies(newSelected)

    // Update select all checkbox state
    setSelectAllSavedChecked(newSelected.size === savedCompanies.length && savedCompanies.length > 0)
  }

  const handleSelectAllSaved = () => {
    if (selectAllSavedChecked) {
      // Deselect all
      setSelectedSavedCompanies(new Set())
      setSelectAllSavedChecked(false)
    } else {
      // Select all
      const allIds = new Set(savedCompanies.map(c => c.id))
      setSelectedSavedCompanies(allIds)
      setSelectAllSavedChecked(true)
    }
  }

  const addToList = async () => {
    const selectedData = searchResults.filter(company =>
      selectedSearchCompanies.includes(company.id)
    )

    if (selectedData.length === 0) {
      alert('No companies selected')
      return
    }

    try {
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

      const result = await response.json()

      if (result.success) {
        alert(result.message)
        // Clear selection after successful save
        setSelectedSearchCompanies([])
        setSelectAllSearchChecked(false)
        // Mark saved companies as added to list
        setSearchResults(prev =>
          prev.map(company => {
            if (selectedSearchCompanies.includes(company.id)) {
              return { ...company, addedToList: true }
            }
            return company
          })
        )
        // Reload saved companies to show new additions
        loadSavedCompanies()
        // Switch to management tab to show newly saved companies
        setActiveTab('manage')
      } else {
        console.error('Failed to save companies:', result.error)
        alert('Failed to add companies to list. Please try again.')
      }
    } catch (error) {
      console.error('Error adding companies to list:', error)
      alert('Error adding companies to list. Please try again.')
    }
  }

  const enrichCompany = async (company, isFromSearch = false) => {
    try {
      setEnrichingCompany(company.place_id || company.id)

      const payload = isFromSearch ? {
        companyData: {
          ...company,
          place_id: company.place_id,
          name: company.name,
          formatted_address: company.address || company.location,
          types: company.types,
          geometry: company.geometry,
          rating: company.rating,
          user_ratings_total: company.user_ratings_total,
          website: company.website
        }
      } : {
        companyId: company.id,
        companyData: company
      }

      const response = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        if (isFromSearch) {
          // Update the company in search results
          setSearchResults(prev =>
            prev.map(c =>
              (c.place_id === company.place_id || c.id === company.id)
                ? { ...c, is_enriched: true, ...result.data }
                : c
            )
          )
        } else {
          // Update the company in saved companies list
          setSavedCompanies(prev =>
            prev.map(c => c.id === company.id ? result.data : c)
          )
        }

        // Update modal if the enriched company is currently being viewed
        if (selectedCompanyDetails &&
            ((selectedCompanyDetails.place_id === company.place_id) ||
             (selectedCompanyDetails.id === company.id))) {
          setSelectedCompanyDetails({ ...selectedCompanyDetails, is_enriched: true, ...result.data })
        }

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

  const exportSelected = (isFromSearch = true) => {
    const selectedData = isFromSearch
      ? searchResults.filter(company => selectedSearchCompanies.includes(company.id))
      : savedCompanies.filter(company => selectedSavedCompanies.has(company.id))

    if (selectedData.length === 0) {
      alert('No companies selected for export')
      return
    }

    // Convert to CSV
    const headers = ['Name', 'Address', 'City', 'State', 'Industry', 'Phone', 'Website', 'Google Rating', 'Review Count', 'Google Listing']
    const csvContent = [
      headers.join(','),
      ...selectedData.map(company => [
        `"${company.name || ''}"`,
        `"${company.address || company.location || ''}"`,
        `"${company.city || ''}"`,
        `"${company.state || ''}"`,
        `"${company.industry || ''}"`,
        `"${company.phone || company.formatted_phone_number || ''}"`,
        `"${company.website || ''}"`,
        company.rating ? company.rating.toFixed(1) : '',
        company.user_ratings_total || '',
        company.place_id ? `"${getGoogleListingUrl(company.place_id)}"` : ''
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

  // Helper function to check if date is today
  const isToday = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
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
              <h1 className="text-xl font-semibold">Company Management</h1>
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
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Company Search & Data Management</h2>
            <p className="text-gray-600">Discover companies, save to your list, and enrich data - all in one place</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'search'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔍 Company Discovery
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'manage'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📊 Data Management ({savedCompanies.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="bg-white shadow rounded-lg p-6">
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
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSearching ? 'Searching...' : 'Search Companies'}
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
                        setSearchResults([])
                        setSelectedSearchCompanies([])
                        setSelectAllSearchChecked(false)
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Results Section */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                    </h3>
                    {selectedSearchCompanies.length > 0 && (
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedSearchCompanies.length} companies selected
                      </p>
                    )}
                  </div>
                  {selectedSearchCompanies.length > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => exportSelected(true)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        📊 Export CSV ({selectedSearchCompanies.length})
                      </button>
                      <button
                        onClick={addToList}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Add to List ({selectedSearchCompanies.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Select All Header for Search Results */}
                {searchResults.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="select-all-search"
                          checked={selectAllSearchChecked}
                          onChange={handleSelectAllSearch}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all-search" className="ml-2 text-sm font-medium text-gray-700">
                          {selectAllSearchChecked ? 'Deselect All' : 'Select All'} ({searchResults.length} companies)
                        </label>
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedSearchCompanies.length > 0 && `${selectedSearchCompanies.length} selected`}
                      </div>
                    </div>
                  </div>
                )}

                {searchResults.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {searchResults.map((company) => (
                      <li key={company.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSearchCompanies.includes(company.id)}
                            onChange={() => toggleSearchCompanySelection(company.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                                  {company.addedToList && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                      ✓ Saved
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {company.industry || 'Industry N/A'} • {company.location || 'Location N/A'}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                  {company.rating && (
                                    <span className="flex items-center gap-1 font-medium text-amber-600">
                                      ⭐ {company.rating.toFixed(1)}
                                      {company.user_ratings_total && (
                                        <span className="text-gray-500">({company.user_ratings_total} reviews)</span>
                                      )}
                                    </span>
                                  )}
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
                                  onClick={() => enrichCompany(company, true)}
                                  disabled={enrichingCompany === (company.place_id || company.id) || company?.is_enriched}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {enrichingCompany === (company.place_id || company.id) ? 'Enriching...' :
                                   company?.is_enriched ? 'Enriched' : 'Enrich Data'}
                                </button>
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
                      Enter search terms to discover companies for acquisition opportunities.
                    </p>
                  </div>
                )}

                {/* Load More Button */}
                {searchResults.length > 0 && hasMoreResults && (
                  <div className="px-6 py-6 border-t border-gray-200 text-center bg-gray-50">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? 'Loading More...' : 'Load More Results'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Management Tab */}
          {activeTab === 'manage' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Today&apos;s Companies</dt>
                          <dd className="text-lg font-medium text-gray-900">{savedCompanies.length}</dd>
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
                            {savedCompanies.filter(c => c?.is_enriched).length}
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
                            {savedCompanies.filter(c => !c?.is_enriched).length}
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
                        <span className="text-2xl">📚</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Historical</dt>
                          <dd className="text-lg font-medium text-gray-900">{historicalCompanies.length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Companies Section */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Today&apos;s Saved Companies</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and enrich your saved company data</p>
                  </div>
                  <div className="flex space-x-3">
                    {savedCompanies.length > 0 && (
                      <>
                        <button
                          onClick={() => exportSelected(false)}
                          disabled={exportingCSV || selectedSavedCompanies.size === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📊 Export Selected ({selectedSavedCompanies.size})
                        </button>
                        <button
                          onClick={async () => {
                            const selectedCompanies = savedCompanies.filter(c =>
                              selectedSavedCompanies.has(c.id) && !c?.is_enriched
                            );

                            if (selectedCompanies.length === 0) {
                              alert('No non-enriched companies selected for enrichment.');
                              return;
                            }

                            if (!confirm(`Enrich ${selectedCompanies.length} selected companies?`)) {
                              return;
                            }

                            for (const company of selectedCompanies) {
                              await enrichCompany(company, false);
                              // Add delay to avoid rate limiting
                              await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                          }}
                          disabled={
                            selectedSavedCompanies.size === 0 ||
                            enrichingCompany !== null ||
                            savedCompanies.filter(c => selectedSavedCompanies.has(c.id) && !c?.is_enriched).length === 0
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🔍 Enrich Selected ({savedCompanies.filter(c => selectedSavedCompanies.has(c.id) && !c?.is_enriched).length})
                        </button>
                      </>
                    )}
                    {historicalCompanies.length > 0 && (
                      <button
                        onClick={() => setShowHistory(true)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        📚 View History ({historicalCompanies.length})
                      </button>
                    )}
                  </div>
                </div>

                {loadingSaved ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4 animate-pulse">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Companies...</h3>
                  </div>
                ) : savedCompanies.length > 0 ? (
                  <div>
                    {/* Select All Header for Saved Companies */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="select-all-saved"
                            checked={selectAllSavedChecked}
                            onChange={handleSelectAllSaved}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="select-all-saved" className="ml-2 text-sm font-medium text-gray-700">
                            {selectAllSavedChecked ? 'Deselect All' : 'Select All'} ({savedCompanies.length} companies)
                          </label>
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedSavedCompanies.size > 0 && `${selectedSavedCompanies.size} selected`}
                        </div>
                      </div>
                    </div>

                    <ul className="divide-y divide-gray-200">
                      {savedCompanies.map((company) => (
                        <li key={company.id} className={`px-6 py-4 ${selectedSavedCompanies.has(company.id) ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedSavedCompanies.has(company.id)}
                                onChange={() => handleSelectSavedCompany(company.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                    company?.is_enriched
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {company?.is_enriched ? 'Enriched' : 'Pending'}
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
                            </div>
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                {!company?.is_enriched && (
                                  <button
                                    onClick={() => enrichCompany(company, false)}
                                    disabled={enrichingCompany === company.id}
                                    className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {enrichingCompany === company.id ? 'Enriching...' : 'Enrich Data'}
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedCompanyDetails(company)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Companies Today</h3>
                    <p className="text-gray-600">
                      Companies you save will appear here for management and enrichment.
                      {historicalCompanies.length > 0 && (
                        <span className="block mt-2">
                          You have {historicalCompanies.length} companies from previous sessions.
                        </span>
                      )}
                    </p>
                    <div className="flex justify-center space-x-3 mt-4">
                      <button
                        onClick={() => setActiveTab('search')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        🔍 Discover Companies
                      </button>
                      {historicalCompanies.length > 0 && (
                        <button
                          onClick={() => setShowHistory(true)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          📚 View History
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
                      <div><strong>Address:</strong> {selectedCompanyDetails.formatted_address || selectedCompanyDetails.address || selectedCompanyDetails.location || 'Not available'}</div>
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
                        <span className={`ml-1 px-2 py-1 text-xs rounded ${selectedCompanyDetails?.is_enriched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {selectedCompanyDetails?.is_enriched ? 'Enriched' : 'Basic Info Only'}
                        </span>
                      </div>
                      <div><strong>Industry:</strong> {selectedCompanyDetails.industry || 'Not specified'}</div>
                      {selectedCompanyDetails.place_id && (
                        <div><strong>Place ID:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{selectedCompanyDetails.place_id}</code></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categories/Types */}
                {selectedCompanyDetails.types && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        // Handle both array (from search results) and string (from saved companies)
                        const typesArray = Array.isArray(selectedCompanyDetails.types)
                          ? selectedCompanyDetails.types
                          : selectedCompanyDetails.types.split(', ').filter(Boolean);

                        return typesArray.map((type, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ));
                      })()}
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
                <div className="flex flex-wrap gap-2">
                  {/* Enrichment Button */}
                  {!selectedCompanyDetails?.is_enriched && (
                    <button
                      onClick={() => {
                        const isFromSearch = !selectedCompanyDetails.created_at; // If no created_at, it's from search results
                        enrichCompany(selectedCompanyDetails, isFromSearch);
                      }}
                      disabled={enrichingCompany === (selectedCompanyDetails.place_id || selectedCompanyDetails.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrichingCompany === (selectedCompanyDetails.place_id || selectedCompanyDetails.id) ? 'Enriching...' : '🔍 Enrich Data'}
                    </button>
                  )}

                  {/* Export Button */}
                  <button
                    onClick={() => {
                      // Create CSV export for single company
                      const headers = ['Name', 'Address', 'City', 'State', 'Industry', 'Phone', 'Website', 'Email', 'Google Rating', 'Review Count', 'Google Listing'];
                      const company = selectedCompanyDetails;
                      const csvContent = [
                        headers.join(','),
                        [
                          `"${company.name || ''}"`,
                          `"${company.formatted_address || company.address || company.location || ''}"`,
                          `"${company.city || ''}"`,
                          `"${company.state || ''}"`,
                          `"${company.industry || ''}"`,
                          `"${company.phone || company.formatted_phone_number || ''}"`,
                          `"${company.website || ''}"`,
                          `"${company.email || ''}"`,
                          company.rating ? company.rating.toFixed(1) : '',
                          company.user_ratings_total || '',
                          company.place_id ? `"${getGoogleListingUrl(company.place_id)}"` : ''
                        ].join(',')
                      ].join('\n');

                      // Create download
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `${company.name.replace(/[^a-zA-Z0-9]/g, '-')}-details.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    📊 Export CSV
                  </button>

                  {selectedCompanyDetails.website && (
                    <a
                      href={selectedCompanyDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      🌐 Visit Website
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}