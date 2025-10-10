'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function SystemSettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    openai: { value: '', status: 'Not Connected' },
    google_places: { value: '', status: 'Not Connected' },
    hunter: { value: '', status: 'Not Connected' },
    apollo: { value: '', status: 'Not Connected' },
    zoominfo: { value: '', username: '', clientId: '', status: 'Not Connected' },
    clay: { value: '', webhookUrl: '', callbackSecret: '', status: 'Not Connected' },
    resend: { value: '', status: 'Not Connected' },
  })

  // Load saved API keys from database on component mount
  useEffect(() => {
    console.log('SystemSettingsPage: Component mounted')
    
    const loadApiKeys = async () => {
      try {
        console.log('🔄 Attempting to load API keys from database...')
        const response = await fetch('/api/settings/api-keys')
        console.log('📡 API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 API response data:', data)
          
          if (Array.isArray(data)) {
            setApiKeys(prevKeys => {
              const updatedKeys = { ...prevKeys }
              data.forEach(keyData => {
                if (updatedKeys[keyData.service]) {
                  updatedKeys[keyData.service] = {
                    value: keyData.encrypted_key || '',
                    username: keyData.username || '',
                    clientId: keyData.client_id || '',
                    webhookUrl: keyData.webhook_url || '',
                    callbackSecret: keyData.callback_secret || '',
                    status: keyData.status || 'Connected'
                  }
                }
              })
              console.log('✅ Successfully loaded API keys from database:', updatedKeys)
              return updatedKeys
            })
          } else {
            console.log('⚠️ No array data returned, keeping defaults')
          }
        } else {
          console.error('❌ Failed to fetch API keys. Status:', response.status)
          const errorText = await response.text()
          console.error('Error response:', errorText)
        }
      } catch (error) {
        console.error('💥 Error loading API keys from database:', error)
      }
    }
    
    // Small delay to ensure component is fully mounted
    setTimeout(loadApiKeys, 100)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load enrichment sources on component mount
  useEffect(() => {
    loadEnrichmentSources()
  }, [])

  const [activeTab, setActiveTab] = useState('apis')
  const [testingApi, setTestingApi] = useState(null)
  const [enrichmentSources, setEnrichmentSources] = useState([])
  const [updatingSource, setUpdatingSource] = useState(null)

  const apiConfigs = {
    openai: {
      name: 'OpenAI API',
      description: 'AI-powered company analysis and report generation',
      placeholder: 'sk-...',
      docs: 'https://platform.openai.com/docs'
    },
    google_places: {
      name: 'Google Places API',
      description: 'Company location data and business information',
      placeholder: 'AIza...',
      docs: 'https://developers.google.com/maps/documentation/places/web-service'
    },
    hunter: {
      name: 'Hunter.io API',
      description: 'Email finding and verification services',
      placeholder: 'hunter-api-key...',
      docs: 'https://hunter.io/api-documentation'
    },
    apollo: {
      name: 'Apollo.io API',
      description: 'B2B contact and company database',
      placeholder: 'apollo-key...',
      docs: 'https://apolloio.github.io/apollo-api-docs/'
    },
    zoominfo: {
      name: 'ZoomInfo API',
      description: 'Business intelligence and contact data (requires Username, Client ID, and Private Key)',
      placeholder: '-----BEGIN PRIVATE KEY-----...',
      docs: 'https://api-docs.zoominfo.com/',
      requiresJWT: true
    },
    clay: {
      name: 'Clay API',
      description: 'Async webhook-based enrichment with 150+ data providers (requires Webhook URL and optional Callback Secret)',
      placeholder: 'your-clay-api-key...',
      docs: 'https://docs.clay.com/',
      requiresWebhook: true
    },
    resend: {
      name: 'Resend API',
      description: 'Email delivery and automation',
      placeholder: 're_...',
      docs: 'https://resend.com/docs'
    }
  }

  const handleApiKeyChange = (api, value, field = 'value') => {
    setApiKeys(prev => ({
      ...prev,
      [api]: { ...prev[api] || { value: '', status: 'Not Connected' }, [field]: value }
    }))
  }

  const testApiConnection = async (api) => {
    setTestingApi(api)
    
    try {
      let testEndpoint = ''
      
      // Use specific test endpoints for each API
      switch(api) {
        case 'google_places':
          testEndpoint = '/api/test-google'
          break
        case 'openai':
          testEndpoint = '/api/test-openai'
          break
        default:
          testEndpoint = `/api/test-${api}`
      }
      
      const response = await fetch(testEndpoint)
      const data = await response.json()
      
      let success = false
      if (api === 'google_places') {
        success = data.tests?.some(test => test.success) || false
      } else {
        success = response.ok
      }
      
      const updatedApiKeys = {
        ...apiKeys,
        [api]: {
          ...apiKeys[api] || { value: '', status: 'Not Connected' },
          status: success ? 'Connected' : 'Connection Failed'
        }
      }
      
      setApiKeys(updatedApiKeys)
      
      // Update database status
      await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: api,
          status: success ? 'Connected' : 'Connection Failed'
        })
      })
      
    } catch (error) {
      console.error(`Error testing ${api} API:`, error)
      const updatedApiKeys = {
        ...apiKeys,
        [api]: {
          ...apiKeys[api] || { value: '', status: 'Not Connected' },
          status: 'Connection Failed'
        }
      }
      setApiKeys(updatedApiKeys)
    } finally {
      setTestingApi(null)
    }
  }

  const saveApiKey = async (api) => {
    try {
      const requestBody = {
        service: api,
        encrypted_key: apiKeys[api]?.value || '',
        status: 'Saved'
      }

      // Add JWT auth fields for ZoomInfo
      if (api === 'zoominfo') {
        requestBody.username = apiKeys[api]?.username || ''
        requestBody.client_id = apiKeys[api]?.clientId || ''
      }

      // Add webhook fields for Clay
      if (api === 'clay') {
        requestBody.webhook_url = apiKeys[api]?.webhookUrl || ''
        requestBody.callback_secret = apiKeys[api]?.callbackSecret || ''
      }

      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (response.ok) {
        const updatedApiKeys = {
          ...apiKeys,
          [api]: {
            ...apiKeys[api] || { value: '', status: 'Not Connected' },
            status: 'Saved'
          }
        }
        
        setApiKeys(updatedApiKeys)
        console.log(`Saved ${api} API key successfully to database`)
        
        // Show temporary success message
        setTimeout(() => {
          setApiKeys(prev => ({
            ...prev,
            [api]: {
              ...prev[api],
              status: prev[api].value ? 'Saved' : 'Not Connected'
            }
          }))
        }, 2000)
      } else {
        console.error(`Failed to save ${api} API key`)
        alert('Failed to save API key. Please try again.')
      }
    } catch (error) {
      console.error(`Error saving ${api} API key:`, error)
      alert('Error saving API key. Please try again.')
    }
  }

  const clearApiKey = async (api) => {
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: api })
      })
      
      if (response.ok) {
        const updatedApiKeys = {
          ...apiKeys,
          [api]: {
            value: '',
            status: 'Not Connected'
          }
        }
        
        setApiKeys(updatedApiKeys)
        console.log(`Cleared ${api} API key from database`)
      } else {
        console.error(`Failed to clear ${api} API key`)
        alert('Failed to clear API key. Please try again.')
      }
    } catch (error) {
      console.error(`Error clearing ${api} API key:`, error)
      alert('Error clearing API key. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Connected': return 'text-green-600 bg-green-50'
      case 'Connection Failed': return 'text-red-600 bg-red-50'
      case 'Saved': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Connected': return '✅'
      case 'Connection Failed': return '❌'
      case 'Saved': return '💾'
      default: return '⚪'
    }
  }

  const loadEnrichmentSources = async () => {
    try {
      const response = await fetch('/api/settings/enrichment-sources')
      const data = await response.json()

      if (data.success) {
        setEnrichmentSources(data.sources || [])
      } else {
        console.error('Failed to load enrichment sources:', data.error)
      }
    } catch (error) {
      console.error('Error loading enrichment sources:', error)
    }
  }

  const updateSourcePriority = async (sourceName, newPriority) => {
    setUpdatingSource(sourceName)

    try {
      const response = await fetch('/api/settings/enrichment-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_name: sourceName,
          priority: newPriority
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reload sources to reflect any swaps
        await loadEnrichmentSources()
      } else {
        console.error('Failed to update source priority:', data.error)
        alert('Failed to update priority. Please try again.')
      }
    } catch (error) {
      console.error('Error updating source priority:', error)
      alert('Error updating priority. Please try again.')
    } finally {
      setUpdatingSource(null)
    }
  }

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 'FIRST': return 'First'
      case 'SECOND': return 'Second'
      case 'THIRD': return 'Third'
      case 'DO_NOT_USE': return 'Do not use'
      default: return priority
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'FIRST': return 'bg-green-100 text-green-800'
      case 'SECOND': return 'bg-blue-100 text-blue-800'
      case 'THIRD': return 'bg-yellow-100 text-yellow-800'
      case 'DO_NOT_USE': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
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
              <h1 className="text-xl font-semibold">System Settings</h1>
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
            <p className="text-gray-600">Manage API connections and system settings</p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('apis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'apis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                API Connections
              </button>
              <button
                onClick={() => setActiveTab('enrichment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'enrichment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Enrichment Sources
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General Settings
              </button>
            </nav>
          </div>

          {/* API Connections Tab */}
          {activeTab === 'apis' && (
            <div className="space-y-6">
              {Object.entries(apiConfigs).map(([key, config]) => (
                <div key={key} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apiKeys[key]?.status || 'Not Connected')}`}>
                        {getStatusIcon(apiKeys[key]?.status || 'Not Connected')} {apiKeys[key]?.status || 'Not Connected'}
                      </span>
                    </div>
                    <a 
                      href={config.docs} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 text-sm"
                    >
                      View Docs →
                    </a>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{config.description}</p>

                  {/* ZoomInfo requires additional JWT fields */}
                  {config.requiresJWT && (
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Your ZoomInfo username"
                          value={apiKeys[key]?.username || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value, 'username')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Client ID from ZoomInfo Admin Portal"
                          value={apiKeys[key]?.clientId || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value, 'clientId')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Private Key <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          placeholder={config.placeholder}
                          value={apiKeys[key]?.value || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Clay requires webhook configuration */}
                  {config.requiresWebhook && (
                    <div className="mb-4 space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                        <p className="text-sm text-blue-800">
                          <strong>Setup Instructions:</strong> Create a webhook table in Clay, copy the webhook URL, and paste it below.
                          Optionally set a callback secret for verification.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clay API Key
                        </label>
                        <input
                          type="password"
                          placeholder={config.placeholder}
                          value={apiKeys[key]?.value || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clay Webhook URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="https://clay.com/webhooks/..."
                          value={apiKeys[key]?.webhookUrl || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value, 'webhookUrl')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Callback Secret (Optional)
                        </label>
                        <input
                          type="password"
                          placeholder="Optional secret for verifying callbacks"
                          value={apiKeys[key]?.callbackSecret || ''}
                          onChange={(e) => handleApiKeyChange(key, e.target.value, 'callbackSecret')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Standard API key input for other services */}
                  <div className={`flex space-x-3 ${config.requiresJWT || config.requiresWebhook ? 'mt-2' : ''}`}>
                    {!config.requiresJWT && !config.requiresWebhook && (
                      <input
                        type="password"
                        placeholder={config.placeholder}
                        value={apiKeys[key]?.value || ''}
                        onChange={(e) => handleApiKeyChange(key, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    <button
                      onClick={() => saveApiKey(key)}
                      disabled={!apiKeys[key]?.value}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => testApiConnection(key)}
                      disabled={!apiKeys[key]?.value || testingApi === key}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingApi === key ? 'Testing...' : 'Test'}
                    </button>
                    {apiKeys[key]?.value && (
                      <button
                        onClick={() => clearApiKey(key)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        title="Clear API Key"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enrichment Sources Tab */}
          {activeTab === 'enrichment' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Enrichment Source Priority</h3>
                <p className="text-sm text-gray-600">
                  Configure the priority order for data enrichment sources. The system will attempt to enrich data
                  in the order specified (First, Second, Third). Sources marked as &quot;Do not use&quot; will be disabled.
                </p>
              </div>

              <div className="space-y-4">
                {enrichmentSources.length > 0 ? (
                  enrichmentSources.map((source) => (
                    <div key={source.id} className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-md font-medium text-gray-900">{source.display_name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(source.priority)}`}>
                              {getPriorityLabel(source.priority)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Status: {source.is_enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>

                        <div className="ml-4">
                          <select
                            value={source.priority}
                            onChange={(e) => updateSourcePriority(source.source_name, e.target.value)}
                            disabled={updatingSource === source.source_name}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="FIRST">First</option>
                            <option value="SECOND">Second</option>
                            <option value="THIRD">Third</option>
                            <option value="DO_NOT_USE">Do not use</option>
                          </select>
                          {updatingSource === source.source_name && (
                            <span className="ml-2 text-sm text-gray-500">Updating...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No enrichment sources configured</p>
                    <p className="text-sm mt-2">Run the database migration to set up enrichment sources</p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>The system attempts enrichment in priority order (First → Second → Third)</li>
                  <li>Only one source can be assigned to each priority level</li>
                  <li>Changing a priority will automatically adjust other sources if needed</li>
                  <li>Sources set to &quot;Do not use&quot; will be disabled entirely</li>
                </ul>
              </div>
            </div>
          )}

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">General Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Exit School Off-Market Tool"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Search Results Limit
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="25">25 results</option>
                    <option value="50" selected>50 results</option>
                    <option value="100">100 results</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-Enrichment
                  </label>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Automatically enrich new companies when discovered</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Registration
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <input type="radio" name="registration" value="admin" className="h-4 w-4 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-gray-700">Admin approval required</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="radio" name="registration" value="auto" className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Auto-approve new users</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="radio" name="registration" value="disabled" className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Disable registration</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}