'use client'

import { useState } from 'react'

export default function ForceUpdateKeyPage() {
  const [service, setService] = useState('zoominfo')
  const [apiKey, setApiKey] = useState('')
  const [username, setUsername] = useState('')
  const [clientId, setClientId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleForceUpdate = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key / Private Key')
      return
    }

    // ZoomInfo requires username and client_id
    if (service === 'zoominfo' && (!username.trim() || !clientId.trim())) {
      alert('ZoomInfo requires Username and Client ID in addition to the Private Key')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const requestBody = { service, apiKey }

      // Add JWT auth fields for ZoomInfo
      if (service === 'zoominfo') {
        requestBody.username = username
        requestBody.clientId = clientId
      }

      const response = await fetch('/api/debug/force-update-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        alert('✅ API key force-updated successfully!')
      } else {
        alert('❌ Failed to update API key: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      setResult({ success: false, error: error.message })
      alert('❌ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔧 Force Update API Key</h1>
          <p className="text-gray-600 mb-6">
            This tool completely deletes the old API key and inserts a fresh new one,
            bypassing any caching or conflict issues.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="zoominfo">ZoomInfo</option>
                <option value="hunter">Hunter.io</option>
                <option value="apollo">Apollo.io</option>
                <option value="google_places">Google Places</option>
                <option value="openai">OpenAI</option>
                <option value="resend">Resend</option>
              </select>
            </div>

            {service === 'zoominfo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your ZoomInfo username..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your ZoomInfo Client ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {service === 'zoominfo' ? 'Private Key' : 'API Key'}
              </label>
              <textarea
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={service === 'zoominfo' ? 'Paste your ZoomInfo private key (including BEGIN/END markers)...' : 'Enter your API key...'}
                rows={service === 'zoominfo' ? 10 : 3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <button
              onClick={handleForceUpdate}
              disabled={loading || !apiKey.trim()}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '⏳ Force Updating...' : '🔄 Force Update API Key'}
            </button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-medium mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? '✅ Success!' : '❌ Error'}
              </h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ What this does:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Completely deletes the old API key from the database</li>
              <li>Inserts a fresh new API key</li>
              <li>Verifies the new key is correctly saved</li>
              <li>Returns a preview of the saved key for confirmation</li>
            </ul>
          </div>

          {service === 'zoominfo' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ ZoomInfo Requirements:</h4>
              <p className="text-sm text-yellow-800 mb-2">
                ZoomInfo uses JWT authentication which requires three pieces of information:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li><strong>Username</strong>: Your ZoomInfo account username</li>
                <li><strong>Client ID</strong>: Found in ZoomInfo Admin Portal → Integrations → API & Webhooks</li>
                <li><strong>Private Key</strong>: Multi-line RSA private key (starts with -----BEGIN PRIVATE KEY-----)</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-2">
                To generate credentials: Go to ZoomInfo Admin Portal → Integrations → API & Webhooks → Generate New Token
              </p>
            </div>
          )}

          <div className="mt-4 text-center">
            <a href="/dashboard/admin/settings" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Back to Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
