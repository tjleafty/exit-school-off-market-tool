'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function UserActivityPage() {
  const params = useParams()
  const userId = params.id

  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('companies') // 'companies', 'enrichment', or 'audit'
  const [enrichmentHistory, setEnrichmentHistory] = useState([])
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      loadUserActivity()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId && activeTab === 'enrichment') {
      loadEnrichmentHistory()
    }
  }, [userId, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId && activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [userId, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserActivity = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/user-activity?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setActivity(data.activity)
      } else {
        console.error('Failed to load user activity:', data.error)
      }
    } catch (error) {
      console.error('Error loading user activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEnrichmentHistory = async () => {
    try {
      setEnrichmentLoading(true)
      const response = await fetch(`/api/admin/enrichment-history?userId=${userId}&limit=100`)
      const data = await response.json()

      if (data.success) {
        setEnrichmentHistory(data.history || [])
      } else {
        console.error('Failed to load enrichment history:', data.error)
      }
    } catch (error) {
      console.error('Error loading enrichment history:', error)
    } finally {
      setEnrichmentLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true)
      const response = await fetch(`/api/admin/audit-log?userId=${userId}&limit=100`)
      const data = await response.json()

      if (data.success) {
        setAuditLogs(data.logs || [])
      } else {
        console.error('Failed to load audit logs:', data.error)
      }
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setAuditLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getActionIcon = (action) => {
    const icons = {
      'CREATE': '➕',
      'UPDATE': '✏️',
      'DELETE': '🗑️',
      'LOGIN': '🔐',
      'LOGOUT': '🚪',
      'ENRICH': '✨',
      'EXPORT': '📤',
      'SEARCH': '🔍',
      'INVITE': '📧'
    }
    return icons[action] || '📝'
  }

  const formatMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') return '-'
    const entries = Object.entries(metadata)
    if (entries.length === 0) return '-'
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user activity...</p>
        </div>
      </div>
    )
  }

  if (!user || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load user activity</p>
          <Link href="/dashboard/admin/users" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin/users" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Users
              </Link>
              <h1 className="text-xl font-semibold">User Activity</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* User Info Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Member since</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">🏢</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.totalCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">✨</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Enriched Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.enrichedCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Reports Generated</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.totalReports}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'companies'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Search History ({activity.totalCompanies})
                </button>
                <button
                  onClick={() => setActiveTab('enrichment')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'enrichment'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Enrichment History ({activity.enrichedCompanies})
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'audit'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Audit Log / Events
                </button>
              </nav>
            </div>

            {/* Companies Tab */}
            {activeTab === 'companies' && (
              <div className="p-6">
                {activity.companies.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No companies found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Industry
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date Added
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activity.companies.map((company) => (
                          <tr key={company.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                              {company.website && (
                                <div className="text-xs text-gray-500">{company.website}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {company.city || company.state ?
                                `${company.city || ''}${company.city && company.state ? ', ' : ''}${company.state || ''}` :
                                company.location || '-'
                              }
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {company.industry || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                company.is_enriched
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {company.is_enriched ? 'Enriched' : 'Not Enriched'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {formatDate(company.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Enrichment History Tab */}
            {activeTab === 'enrichment' && (
              <div className="p-6">
                {enrichmentLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading enrichment history...</p>
                  </div>
                ) : enrichmentHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No enrichment activities found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Sources
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Completeness
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {enrichmentHistory.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {record.company_name}
                              </div>
                              {record.company_website && (
                                <div className="text-xs text-gray-500">{record.company_website}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                record.enrichment_tier === 'ENHANCED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {record.enrichment_tier}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {record.sources_used?.join(', ') || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {Math.round((record.data_completeness || 0) * 100)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === 'audit' && (
              <div className="p-6">
                {auditLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading audit log...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No audit log events found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entity Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Entity ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(log.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="mr-2">{getActionIcon(log.action)}</span>
                                <span className="text-sm font-medium text-gray-900">{log.action}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.entity || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                              {log.entity_id ? (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {log.entity_id.substring(0, 8)}...
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatMetadata(log.metadata)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
