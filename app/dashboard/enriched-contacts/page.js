'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function EnrichedContactsPage() {
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState(new Set())
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    source: 'all',
    hasEmail: 'all',
    managementLevel: 'all',
    companyId: 'all'
  })
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  useEffect(() => {
    // Load user from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)
      }
    }
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadContacts()
      loadCompanies()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCompanies() {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_enriched', true)
      .order('name')

    if (!error && data) {
      setCompanies(data)
    }
  }

  async function loadContacts() {
    if (!user?.id) return

    setLoading(true)

    // Get user's companies first
    const { data: userCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)

    if (companiesError) {
      console.error('Error loading user companies:', companiesError)
      setLoading(false)
      return
    }

    const companyIds = userCompanies.map(c => c.id)

    if (companyIds.length === 0) {
      setContacts([])
      setLoading(false)
      return
    }

    // Load contacts only for user's companies
    let query = supabase
      .from('company_contacts')
      .select(`
        *,
        companies (
          id,
          name,
          website
        )
      `)
      .in('company_id', companyIds)

    const { data, error } = await query

    if (error) {
      console.error('Error loading contacts:', error)
      setLoading(false)
      return
    }

    setContacts(data || [])
    setLoading(false)
  }

  // Filter contacts based on current filters
  const filteredContacts = contacts.filter(contact => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        contact.first_name?.toLowerCase().includes(searchLower) ||
        contact.last_name?.toLowerCase().includes(searchLower) ||
        contact.job_title?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.companies?.name?.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Source filter
    if (filters.source !== 'all' && contact.source !== filters.source) {
      return false
    }

    // Has email filter
    if (filters.hasEmail === 'yes' && !contact.email) return false
    if (filters.hasEmail === 'no' && contact.email) return false

    // Management level filter
    if (filters.managementLevel !== 'all' && contact.management_level !== filters.managementLevel) {
      return false
    }

    // Company filter
    if (filters.companyId !== 'all' && contact.company_id !== filters.companyId) {
      return false
    }

    return true
  })

  // Sort contacts
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    let aValue = a[sortConfig.key]
    let bValue = b[sortConfig.key]

    // Handle nested company name
    if (sortConfig.key === 'company_name') {
      aValue = a.companies?.name || ''
      bValue = b.companies?.name || ''
    }

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  function toggleSelectAll() {
    if (selectedContacts.size === sortedContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(sortedContacts.map(c => c.id)))
    }
  }

  function toggleSelect(contactId) {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
  }

  async function exportSelected() {
    if (selectedContacts.size === 0) {
      alert('Please select contacts to export')
      return
    }

    const selectedData = sortedContacts.filter(c => selectedContacts.has(c.id))

    // For now, download as JSON
    // TODO: Convert to Excel format
    const dataStr = JSON.stringify(selectedData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacts-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Enriched Contacts</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedContacts.size} of {sortedContacts.length} selected
              </span>
              {selectedContacts.size > 0 && (
                <button
                  onClick={exportSelected}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Export Selected ({selectedContacts.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search name, title, email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />

            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Sources</option>
              <option value="zoominfo">ZoomInfo</option>
              <option value="apollo">Apollo</option>
              <option value="hunter">Hunter.io</option>
            </select>

            <select
              value={filters.hasEmail}
              onChange={(e) => setFilters({ ...filters, hasEmail: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Contacts</option>
              <option value="yes">Has Email</option>
              <option value="no">No Email</option>
            </select>

            <select
              value={filters.managementLevel}
              onChange={(e) => setFilters({ ...filters, managementLevel: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Levels</option>
              <option value="C Level Exec">C-Level</option>
              <option value="VP Level Exec">VP-Level</option>
              <option value="Director">Director</option>
            </select>

            <select
              value={filters.companyId}
              onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading contacts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === sortedContacts.length && sortedContacts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th onClick={() => handleSort('first_name')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Name {sortConfig.key === 'first_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('job_title')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Title {sortConfig.key === 'job_title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('company_name')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Company {sortConfig.key === 'company_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th onClick={() => handleSort('source')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Source {sortConfig.key === 'source' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('confidence_score')} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Score {sortConfig.key === 'confidence_score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedContacts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No contacts found. Try enriching some companies first.
                      </td>
                    </tr>
                  ) : (
                    sortedContacts.map(contact => (
                      <tr key={contact.id} className={selectedContacts.has(contact.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.management_level && (
                            <div className="text-xs text-gray-500">{contact.management_level}</div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {contact.job_title || '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {contact.companies?.name || '-'}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-gray-400">No email</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {contact.direct_phone || contact.mobile_phone || contact.phone || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            contact.source === 'zoominfo' ? 'bg-purple-100 text-purple-800' :
                            contact.source === 'apollo' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {contact.source}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {contact.confidence_score || contact.contact_accuracy_score || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Contacts</div>
            <div className="text-2xl font-bold text-gray-900">{contacts.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">With Email</div>
            <div className="text-2xl font-bold text-green-600">
              {contacts.filter(c => c.email).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">ZoomInfo</div>
            <div className="text-2xl font-bold text-purple-600">
              {contacts.filter(c => c.source === 'zoominfo').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Filtered Results</div>
            <div className="text-2xl font-bold text-blue-600">{sortedContacts.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
