'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function EnrichmentConfigPage() {
  const [fields, setFields] = useState([])
  const [fieldsByCategory, setFieldsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [pendingChanges, setPendingChanges] = useState({})
  const [summary, setSummary] = useState({ total: 0, basic: 0, enhanced: 0, none: 0 })

  useEffect(() => {
    loadEnrichmentFields()
  }, [])

  const loadEnrichmentFields = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/enrichment-fields')
      const data = await response.json()

      if (data.success) {
        setFields(data.fields)
        setFieldsByCategory(data.fieldsByCategory)
        setSummary(data.summary)
      } else {
        console.error('Failed to load enrichment fields:', data.error)
      }
    } catch (error) {
      console.error('Error loading enrichment fields:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTierChange = (fieldName, newTier) => {
    setPendingChanges(prev => ({
      ...prev,
      [fieldName]: newTier
    }))
  }

  const savePendingChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      alert('No changes to save')
      return
    }

    setSaving(true)

    try {
      const updates = Object.entries(pendingChanges).map(([field_name, tier]) => ({
        field_name,
        tier
      }))

      const response = await fetch('/api/settings/enrichment-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Successfully updated ${data.updated} fields`)
        setPendingChanges({})
        await loadEnrichmentFields()
      } else {
        console.error('Failed to update fields:', data.error)
        alert('Failed to update some fields. Check console for details.')
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Error saving changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => {
    setPendingChanges({})
  }

  const getTierColor = (tier) => {
    switch(tier) {
      case 'BASIC': return 'bg-blue-100 text-blue-800'
      case 'ENHANCED': return 'bg-purple-100 text-purple-800'
      case 'BOTH': return 'bg-green-100 text-green-800'
      case 'NONE': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getTierLabel = (tier) => {
    return tier.charAt(0) + tier.slice(1).toLowerCase()
  }

  const getDataTypeIcon = (dataType) => {
    switch(dataType) {
      case 'email': return '📧'
      case 'phone': return '📞'
      case 'url': return '🔗'
      case 'date': return '📅'
      case 'number': return '🔢'
      case 'text': return '📝'
      default: return '📄'
    }
  }

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'contact': return '👤'
      case 'company': return '🏢'
      case 'financial': return '💰'
      case 'firmographics': return '📊'
      case 'location': return '📍'
      case 'social': return '🌐'
      default: return '📋'
    }
  }

  const filterFields = (fields) => {
    let filtered = fields

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.field_category === selectedCategory)
    }

    if (filterTier !== 'all') {
      filtered = filtered.filter(f => {
        const currentTier = pendingChanges[f.field_name] || f.tier
        return currentTier === filterTier
      })
    }

    return filtered
  }

  const categories = [...new Set(fields.map(f => f.field_category))].sort()

  const filteredFields = filterFields(fields)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Admin
              </Link>
              <h1 className="text-xl font-semibold">Enrichment Field Configuration</h1>
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
          {/* Header Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Configure Enrichment Data Fields</h2>
            <p className="text-gray-600 mt-1">
              Select which fields are included in Basic and Enhanced enrichment tiers
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Fields</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🔵</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Basic Tier</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.basic}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🟣</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Enhanced Tier</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.enhanced}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚪</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Not Used</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.none}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier Filter</label>
                  <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Tiers</option>
                    <option value="BASIC">Basic Only</option>
                    <option value="ENHANCED">Enhanced Only</option>
                    <option value="BOTH">Both Tiers</option>
                    <option value="NONE">Not Used</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {Object.keys(pendingChanges).length > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {Object.keys(pendingChanges).length} pending change(s)
                    </span>
                    <button
                      onClick={discardChanges}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Discard
                    </button>
                    <button
                      onClick={savePendingChanges}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fields Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4 animate-pulse">⏳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Fields...</h3>
              </div>
            ) : filteredFields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Field
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assign To Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFields.map((field) => {
                      const currentTier = pendingChanges[field.field_name] || field.tier
                      const hasChange = pendingChanges[field.field_name] !== undefined

                      return (
                        <tr key={field.id} className={hasChange ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {field.display_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {field.field_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {getCategoryIcon(field.field_category)} {field.field_category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {getDataTypeIcon(field.data_type)} {field.data_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(field.tier)}`}>
                              {getTierLabel(field.tier)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={currentTier}
                              onChange={(e) => handleTierChange(field.field_name, e.target.value)}
                              className={`px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                hasChange ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                              }`}
                            >
                              <option value="BASIC">Basic</option>
                              <option value="ENHANCED">Enhanced</option>
                              <option value="BOTH">Both</option>
                              <option value="NONE">Not Used</option>
                            </select>
                            {hasChange && (
                              <span className="ml-2 text-xs text-yellow-600">
                                ✎ Modified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {field.description || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Found</h3>
                <p className="text-gray-600 mb-4">
                  {fields.length === 0
                    ? 'No enrichment fields are configured in the database.'
                    : 'Try adjusting your filters to see fields.'}
                </p>
                {fields.length === 0 && (
                  <div className="mt-6 max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-3">⚠️ Setup Required</h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      The enrichment fields table is empty. You need to run the database migration to populate it with 65+ fields from the ZoomInfo data model.
                    </p>
                    <div className="text-sm text-yellow-800 space-y-2">
                      <p className="font-semibold">To fix this:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to your Supabase Dashboard → SQL Editor</li>
                        <li>Copy and paste the contents of <code className="bg-yellow-100 px-1 rounded">supabase/migrations/008_enrichment_fields_system.sql</code></li>
                        <li>Click "Run" to execute the migration</li>
                        <li>Refresh this page</li>
                      </ol>
                      <p className="mt-3 pt-3 border-t border-yellow-300">
                        <strong>Expected result:</strong> 65 fields organized into 6 categories (Contact, Company, Financial, Firmographics, Location, Social)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 About Enrichment Tiers:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Basic:</strong> Included in the basic enrichment package (essential contact and company info)</li>
              <li><strong>Enhanced:</strong> Premium fields included only in enhanced/BI reports (detailed financials, social media, etc.)</li>
              <li><strong>Both:</strong> Field is included in both basic and enhanced tiers</li>
              <li><strong>Not Used:</strong> Field is available but not currently used in enrichment</li>
            </ul>
            <p className="text-sm text-blue-800 mt-3">
              Fields are based on the ZoomInfo data structure and can be populated by your configured enrichment sources (ZoomInfo, Hunter.io, Apollo.io).
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
