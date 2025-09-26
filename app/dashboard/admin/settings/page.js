'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function SystemSettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    openai: { value: '', status: 'Not Connected' },
    google_places: { value: '', status: 'Not Connected' },
    hunter: { value: '', status: 'Not Connected' },
    apollo: { value: '', status: 'Not Connected' },
    zoominfo: { value: '', status: 'Not Connected' },
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

  const [activeTab, setActiveTab] = useState('apis')
  const [testingApi, setTestingApi] = useState(null)

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
      description: 'Business intelligence and contact data',
      placeholder: 'zi-api-key...',
      docs: 'https://api-docs.zoominfo.com/'
    },
    resend: {
      name: 'Resend API',
      description: 'Email delivery and automation',
      placeholder: 're_...',
      docs: 'https://resend.com/docs'
    }
  }

  const handleApiKeyChange = (api, value) => {
    setApiKeys(prev => ({
      ...prev,
      [api]: { ...prev[api] || { value: '', status: 'Not Connected' }, value }
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
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: api,
          encrypted_key: apiKeys[api]?.value || '',
          status: 'Saved'
        })
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
                  
                  <div className="flex space-x-3">
                    <input
                      type="password"
                      placeholder={config.placeholder}
                      value={apiKeys[key]?.value || ''}
                      onChange={(e) => handleApiKeyChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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