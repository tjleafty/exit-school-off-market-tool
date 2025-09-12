'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function SetupDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const insertDefaultSettings = async () => {
    try {
      setLoading(true)
      setResult(null)
      
      const response = await fetch('/api/admin/insert-default-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      setResult(data)
      
    } catch (error) {
      console.error('Error:', error)
      setResult({
        success: false,
        error: 'Network error occurred'
      })
    } finally {
      setLoading(false)
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
              <h1 className="text-xl font-semibold">Database Setup</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Report Settings Database Setup</h2>
            <p className="text-gray-600">Set up the report settings table and insert default data</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Create Table Structure</h3>
            <p className="text-sm text-gray-600 mb-4">
              Run this SQL in your Supabase Dashboard → SQL Editor:
            </p>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS public.report_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_settings_updated_at 
ON public.report_settings(updated_at DESC);

ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can manage report settings" 
ON public.report_settings;

CREATE POLICY "Admin users can manage report settings" 
ON public.report_settings FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_settings TO anon;`}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-blue-600">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> Copy the SQL above and paste it into your Supabase Dashboard's SQL Editor, then click "Run".
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Insert Default Settings</h3>
            <p className="text-sm text-gray-600 mb-4">
              After running the SQL above, click this button to insert the default report settings:
            </p>
            
            <button
              onClick={insertDefaultSettings}
              disabled={loading}
              className={`px-6 py-2 rounded-md font-medium ${
                loading 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Inserting...' : 'Insert Default Settings'}
            </button>

            {result && (
              <div className={`mt-4 p-4 rounded-md ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      <strong>{result.success ? 'Success:' : 'Error:'}</strong> {result.message || result.error}
                    </p>
                    {result.success && (
                      <div className="mt-3">
                        <Link 
                          href="/dashboard/admin/report-settings"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          Go to Report Settings →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}