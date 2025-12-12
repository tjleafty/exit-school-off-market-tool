'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    company_name: '',
    job_title: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: ''
  })

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)

      // Pre-fill with existing data if available
      setProfileData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        full_name: userData.full_name || userData.name || '',
        phone: userData.phone || '',
        company_name: userData.company_name || '',
        job_title: userData.job_title || '',
        street_address: userData.street_address || '',
        city: userData.city || '',
        state: userData.state || '',
        zip_code: userData.zip_code || ''
      })

      setLoading(false)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!profileData.first_name || !profileData.last_name) {
      alert('First name and last name are required')
      return
    }

    setSaving(true)

    // Generate full_name from first_name and last_name
    const full_name = `${profileData.first_name} ${profileData.last_name}`.trim()

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          name: full_name,
          full_name: full_name,
          phone: profileData.phone,
          company_name: profileData.company_name,
          job_title: profileData.job_title,
          street_address: profileData.street_address,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zip_code,
          email: user.email,
          role: user.role,
          status: user.status
        })
      })

      const data = await response.json()

      if (data.user) {
        // Update localStorage with new user data
        const updatedUser = {
          ...user,
          ...profileData
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))

        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        alert('Failed to update profile. Please try again.')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide your contact information to continue
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company/Organization
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={profileData.company_name}
                onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title/Position
              </label>
              <input
                id="job_title"
                name="job_title"
                type="text"
                value={profileData.job_title}
                onChange={(e) => setProfileData({ ...profileData, job_title: e.target.value })}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Business Development Manager"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Address (Optional)</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    id="street_address"
                    name="street_address"
                    type="text"
                    value={profileData.street_address}
                    onChange={(e) => setProfileData({ ...profileData, street_address: e.target.value })}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      value={profileData.state}
                      onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="CA"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    id="zip_code"
                    name="zip_code"
                    type="text"
                    value={profileData.zip_code}
                    onChange={(e) => setProfileData({ ...profileData, zip_code: e.target.value })}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="94102"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue to Dashboard'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
