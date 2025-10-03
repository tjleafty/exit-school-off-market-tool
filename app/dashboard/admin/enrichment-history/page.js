'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function EnrichmentHistoryPage() {
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filters
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchCompany, setSearchCompany] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  // Stats period
  const [statsPeriod, setStatsPeriod] = useState(30)

  useEffect(() => {
    loadEnrichmentHistory()
  }, [page, filterTier, filterStatus, filterUser, filterDateFrom, filterDateTo, searchCompany])

  useEffect(() => {
    loadStats()
  }, [statsPeriod])

  const loadEnrichmentHistory = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      if (filterTier !== 'all') params.append('tier', filterTier)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterUser !== 'all') params.append('userId', filterUser)
      if (filterDateFrom) params.append('dateFrom', filterDateFrom)
      if (filterDateTo) params.append('dateTo', filterDateTo)
      if (searchCompany) params.append('companyName', searchCompany)

      const response = await fetch(`/api/admin/enrichment-history?${params}`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.history || [])
        setPagination(data.pagination || {})
      } else {
        console.error('Failed to load enrichment history:', data.error)
      }
    } catch (error) {
      console.error('Error loading enrichment history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch(`/api/admin/enrichment-stats?days=${statsPeriod}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.stats || {})
      } else {
        console.error('Failed to load stats:', data.error)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const clearFilters = () => {
    setFilterTier('all')
    setFilterStatus('all')
    setFilterUser('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchCompany('')
    setPage(1)
  }

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Company', 'User', 'Tier', 'Type', 'Status', 'Sources', 'Fields', 'Completeness', 'Duration']
    const rows = history.map(h => [
      new Date(h.created_at).toLocaleString(),
      h.company_name,
      h.users?.email || 'Unknown',
      h.enrichment_tier,
      h.enrichment_type,
      h.status,
      h.sources_used?.join(', ') || '',
      `${h.fields_populated}/${h.fields_requested}`,
      `${Math.round((h.data_completeness || 0) * 100)}%`,
      `${h.duration_ms || 0}ms`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enrichment-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800'
      case 'RUNNING': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getTierColor = (tier) => {
    return tier === 'ENHANCED' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }

  const formatDuration = (ms) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Admin
              </Link>
              <h1 className="text-xl font-semibold">Enrichment History</h1>
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
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Enrichment Activity Log</h2>
            <p className="text-gray-600 mt-1">
              Complete history of all enrichment activities with user attribution
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Enrichments (Last {statsPeriod} days)
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : (stats.total_enrichments || 0).toLocaleString()}
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
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' :
                          stats.total_enrichments > 0
                            ? `${Math.round((stats.successful_enrichments / stats.total_enrichments) * 100)}%`
                            : '0%'
                        }
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
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : (stats.unique_users || 0)}
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
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Completeness</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' :
                          stats.avg_completeness
                            ? `${Math.round(stats.avg_completeness * 100)}%`
                            : '0%'
                        }
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={filterTier}
                  onChange={(e) => { setFilterTier(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="BASIC">Basic</option>
                  <option value="ENHANCED">Enhanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search company name..."
                  value={searchCompany}
                  onChange={(e) => { setSearchCompany(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Clear Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={history.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  📊 Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4 animate-pulse">⏳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading History...</h3>
              </div>
            ) : history.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tier / Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sources
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fields
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.created_at).toLocaleDateString()}<br />
                            <span className="text-xs text-gray-500">
                              {new Date(record.created_at).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.company_name}
                            </div>
                            {record.company_website && (
                              <div className="text-xs text-gray-500">
                                {record.company_website}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record.users?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.users?.email || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(record.enrichment_tier)}`}>
                              {record.enrichment_tier}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {record.enrichment_type}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {record.sources_used?.join(', ') || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="text-gray-900">
                              {record.fields_populated}/{record.fields_requested}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round((record.data_completeness || 0) * 100)}% complete
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(record.duration_ms)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{page}</span> of{' '}
                          <span className="font-medium">{pagination.totalPages}</span>
                          {' '}({pagination.total} total records)
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === pagination.totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No History Found</h3>
                <p className="text-gray-600">
                  No enrichment activities match your current filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
