'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminReportSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('enhanced')
  
  // Default prompts based on current system
  const [settings, setSettings] = useState({
    enhanced: {
      system_prompt: "You are a business analyst creating an enhanced company overview report. Provide clear, concise insights about the company's potential and key opportunities. Keep the analysis practical and focused on immediate opportunities.",
      executive_summary: "Generate a comprehensive 2-3 paragraph executive summary that provides a high-level overview of the company's business model, market position, and key value propositions. Focus on what makes this company unique and why they would be an attractive business partner or acquisition target.",
      company_overview: "Provide a detailed analysis of the company's operations, business model, market presence, and competitive positioning. Include insights about their services/products, target market, and operational scale based on available data.",
      key_personnel: "Analyze the available leadership and key personnel data. Identify decision-makers, their backgrounds, and contact information. Assess the leadership team's experience and potential influence on partnership discussions.",
      growth_opportunities: "Identify specific, actionable growth opportunities and partnership potential. Focus on concrete ways this company could expand, areas where they might need partners, and specific value propositions for business development outreach.",
      recommendations: "Provide clear, actionable next steps for business development engagement. Include recommended approach strategies, key talking points, and specific actions to take for initial outreach and relationship building."
    },
    bi: {
      system_prompt: "You are a business intelligence analyst creating a comprehensive B2B company report. Generate detailed insights with market analysis, financial projections, and strategic recommendations. Focus on data-driven insights and actionable intelligence.",
      executive_summary: "Create an executive summary that provides strategic insights into the company's market position, financial health, growth trajectory, and strategic value. Include key metrics, market dynamics, and high-level investment or partnership attractiveness.",
      company_overview: "Conduct a thorough business analysis including operational model, revenue streams, market positioning, competitive landscape, and strategic assets. Evaluate the company's business fundamentals and market differentiation.",
      market_analysis: "Perform comprehensive market analysis including industry trends, competitive positioning, market share estimation, growth drivers, and market dynamics. Assess the company's position within broader industry context and identify market opportunities and threats.",
      financial_insights: "Analyze financial performance, revenue trends, profitability indicators, and growth projections. Include benchmark comparisons, financial health assessment, and investment attractiveness. Estimate valuation ranges and financial risk factors.",
      key_personnel: "Provide detailed leadership analysis including executive backgrounds, experience, network connections, and strategic decision-making authority. Assess team capabilities and potential influence on partnership or acquisition decisions.",
      growth_opportunities: "Identify comprehensive growth opportunities including market expansion, product development, strategic partnerships, acquisition targets, and operational improvements. Provide specific recommendations with implementation strategies.",
      risk_assessment: "Conduct thorough risk analysis including market risks, competitive threats, operational challenges, financial risks, and regulatory considerations. Provide risk mitigation strategies and contingency planning recommendations.",
      recommendations: "Deliver strategic recommendations for business development, partnership approach, negotiation strategies, and long-term relationship building. Include specific action plans, timeline recommendations, and success metrics."
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/report-settings')
      
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      } else {
        console.log('No existing settings found, using defaults')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      alert('Error loading report settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/report-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Report settings saved successfully!')
      } else {
        alert('Failed to save settings: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving report settings')
    } finally {
      setSaving(false)
    }
  }

  const updatePrompt = (tier, section, value) => {
    setSettings(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [section]: value
      }
    }))
  }

  const resetToDefaults = (tier) => {
    if (window.confirm(`Are you sure you want to reset all ${tier.toUpperCase()} report prompts to default values? This cannot be undone.`)) {
      // Reset would restore the default values - implemented when we have a defaults API
      alert('Reset functionality will be implemented with the defaults API')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report settings...</p>
        </div>
      </div>
    )
  }

  const currentSettings = settings[activeTab]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Admin
              </Link>
              <h1 className="text-xl font-semibold">BI Report Settings</h1>
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
            <h2 className="text-2xl font-bold text-gray-900">Business Intelligence Report Settings</h2>
            <p className="text-gray-600">Configure AI prompts for each section of the BI reports</p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <strong>Important:</strong> Changes to these prompts will affect all future report generations. 
              Test thoroughly before saving changes to production.
            </div>
          </div>

          {/* Report Tier Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('enhanced')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'enhanced'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Enhanced Reports
                  <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs">
                    5 Sections
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('bi')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'bi'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Business Intelligence Reports
                  <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
                    8 Sections
                  </span>
                </button>
              </nav>
            </div>
          </div>

          <div className="space-y-6">
            {/* System Prompt */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  🤖 System Prompt
                  <span className="ml-2 bg-purple-100 text-purple-800 py-0.5 px-2 rounded-full text-xs">
                    Core Behavior
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Defines the AI&apos;s role and overall approach for {activeTab} reports
                </p>
              </div>
              <textarea
                value={currentSettings.system_prompt}
                onChange={(e) => updatePrompt(activeTab, 'system_prompt', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the system prompt that defines the AI's role..."
              />
              <div className="mt-2 text-xs text-gray-500">
                Character count: {currentSettings.system_prompt.length}
              </div>
            </div>

            {/* Report Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Executive Summary */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">📋 Executive Summary</h3>
                  <p className="text-sm text-gray-600">High-level overview and key insights</p>
                </div>
                <textarea
                  value={currentSettings.executive_summary}
                  onChange={(e) => updatePrompt(activeTab, 'executive_summary', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {currentSettings.executive_summary.length} chars
                </div>
              </div>

              {/* Company Overview */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">🏢 Company Overview</h3>
                  <p className="text-sm text-gray-600">Detailed business analysis</p>
                </div>
                <textarea
                  value={currentSettings.company_overview}
                  onChange={(e) => updatePrompt(activeTab, 'company_overview', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {currentSettings.company_overview.length} chars
                </div>
              </div>

              {/* Market Analysis (BI Only) */}
              {activeTab === 'bi' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">📈 Market Analysis</h3>
                    <p className="text-sm text-gray-600">Industry trends and competitive positioning</p>
                  </div>
                  <textarea
                    value={currentSettings.market_analysis}
                    onChange={(e) => updatePrompt(activeTab, 'market_analysis', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {currentSettings.market_analysis.length} chars
                  </div>
                </div>
              )}

              {/* Financial Insights (BI Only) */}
              {activeTab === 'bi' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">💰 Financial Insights</h3>
                    <p className="text-sm text-gray-600">Revenue analysis and financial projections</p>
                  </div>
                  <textarea
                    value={currentSettings.financial_insights}
                    onChange={(e) => updatePrompt(activeTab, 'financial_insights', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {currentSettings.financial_insights.length} chars
                  </div>
                </div>
              )}

              {/* Key Personnel */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">👥 Key Personnel</h3>
                  <p className="text-sm text-gray-600">Leadership and decision-maker analysis</p>
                </div>
                <textarea
                  value={currentSettings.key_personnel}
                  onChange={(e) => updatePrompt(activeTab, 'key_personnel', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {currentSettings.key_personnel.length} chars
                </div>
              </div>

              {/* Growth Opportunities */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">🚀 Growth Opportunities</h3>
                  <p className="text-sm text-gray-600">Partnership and expansion potential</p>
                </div>
                <textarea
                  value={currentSettings.growth_opportunities}
                  onChange={(e) => updatePrompt(activeTab, 'growth_opportunities', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {currentSettings.growth_opportunities.length} chars
                </div>
              </div>

              {/* Risk Assessment (BI Only) */}
              {activeTab === 'bi' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">⚠️ Risk Assessment</h3>
                    <p className="text-sm text-gray-600">Potential challenges and mitigation strategies</p>
                  </div>
                  <textarea
                    value={currentSettings.risk_assessment}
                    onChange={(e) => updatePrompt(activeTab, 'risk_assessment', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {currentSettings.risk_assessment.length} chars
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">💡 Recommendations</h3>
                  <p className="text-sm text-gray-600">Actionable next steps and strategies</p>
                </div>
                <textarea
                  value={currentSettings.recommendations}
                  onChange={(e) => updatePrompt(activeTab, 'recommendations', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {currentSettings.recommendations.length} chars
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => resetToDefaults(activeTab)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Reset to Defaults
            </button>
            <div className="space-x-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className={`px-6 py-2 rounded-md font-medium ${
                  saving
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Usage Instructions</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Prompt Variables:</strong> Use {`{company_name}`}, {`{industry}`}, {`{location}`}, etc. in your prompts</p>
              <p><strong>Enhanced Reports:</strong> Focus on practical, immediate opportunities (5 sections)</p>
              <p><strong>BI Reports:</strong> Comprehensive analysis with market and financial insights (8 sections)</p>
              <p><strong>Best Practices:</strong> Be specific, actionable, and data-driven in your prompts</p>
              <p><strong>Testing:</strong> Always test prompt changes on sample companies before production use</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}