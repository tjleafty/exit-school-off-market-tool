'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function EmailAutomationPage() {
  const [campaigns] = useState([
    {
      id: 1,
      name: 'Q1 Acquisition Outreach',
      status: 'Active',
      sent: 150,
      opened: 45,
      replied: 8,
      created: '2025-01-01'
    },
    {
      id: 2,
      name: 'SaaS Companies - Initial Contact',
      status: 'Draft',
      sent: 0,
      opened: 0,
      replied: 0,
      created: '2025-01-03'
    }
  ])

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Email Automation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Admin
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
            <h2 className="text-2xl font-bold text-gray-900">Email Automation</h2>
            <p className="text-gray-600">Create and manage automated email campaigns for outreach</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📧</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Sent</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {campaigns.reduce((sum, c) => sum + c.sent, 0)}
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
                    <span className="text-2xl">👀</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Opened</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {campaigns.reduce((sum, c) => sum + c.opened, 0)}
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
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Replies</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {campaigns.reduce((sum, c) => sum + c.replied, 0)}
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
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Reply Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {campaigns.reduce((sum, c) => sum + c.sent, 0) > 0 
                          ? Math.round((campaigns.reduce((sum, c) => sum + c.replied, 0) / campaigns.reduce((sum, c) => sum + c.sent, 0)) * 100)
                          : 0}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Email Campaigns</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your automated email campaigns</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Create Campaign
              </button>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900">{campaign.name}</h4>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>📧 Sent: {campaign.sent}</div>
                        <div>👀 Opened: {campaign.opened}</div>
                        <div>💬 Replied: {campaign.replied}</div>
                        <div>📅 Created: {campaign.created}</div>
                      </div>
                      {campaign.sent > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          Open Rate: {Math.round((campaign.opened / campaign.sent) * 100)}% | 
                          Reply Rate: {Math.round((campaign.replied / campaign.sent) * 100)}%
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {campaign.status === 'Draft' && (
                        <button className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700">
                          Launch
                        </button>
                      )}
                      <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
                        View
                      </button>
                      <button className="px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700">
                        Edit
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}