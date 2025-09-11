'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUserActivity, setSelectedUserActivity] = useState(null)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER',
    password: '',
    confirmPassword: '',
    creationType: 'manual',
    sendInvite: false
  })

  // Load users from database
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (!newUser.name || !newUser.email) {
      alert('Name and email are required')
      return
    }
    
    if (newUser.creationType === 'manual' && (!newUser.password || newUser.password !== newUser.confirmPassword)) {
      alert('Password and confirmation must match')
      return
    }
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.creationType === 'manual' ? 'ACTIVE' : 'INVITED',
          method: newUser.creationType === 'manual' ? 'MANUAL' : 'INVITE',
          hasPassword: newUser.creationType === 'manual',
          password: newUser.creationType === 'manual' ? newUser.password : undefined,
          createdBy: 'Admin'
        })
      })

      const data = await response.json()
      
      if (data.user) {
        await fetchUsers() // Refresh user list
        setShowCreateForm(false)
        setNewUser({
          name: '',
          email: '',
          role: 'USER',
          password: '',
          confirmPassword: '',
          creationType: 'manual',
          sendInvite: false
        })
      } else {
        alert('Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      features: user.features || {
        companySearch: true,
        companyEnrichment: true,
        businessIntelligence: true
      }
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      })

      const data = await response.json()
      
      if (data.user) {
        await fetchUsers() // Refresh user list
        setShowEditModal(false)
        setEditingUser(null)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchUsers() // Refresh user list
        setShowEditModal(false)
        setEditingUser(null)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleViewUserDetails = async (user) => {
    try {
      setLoadingActivity(true)
      setShowUserDetails(true)
      setSelectedUserActivity(null)

      console.log('Fetching activity for user:', user.id)
      const response = await fetch(`/api/admin/user-activity?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setSelectedUserActivity(data)
      } else {
        alert('Failed to load user activity: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error fetching user activity:', error)
      alert('Failed to load user activity')
    } finally {
      setLoadingActivity(false)
    }
  }

  const closeUserDetails = () => {
    setShowUserDetails(false)
    setSelectedUserActivity(null)
    setLoadingActivity(false)
  }

  const handleSuspendUser = async () => {
    const newStatus = editingUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const updatedUser = { ...editingUser, status: newStatus }
    setEditingUser(updatedUser)
    
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })

      const data = await response.json()
      
      if (data.user) {
        await fetchUsers() // Refresh user list
      }
    } catch (error) {
      console.error('Error suspending user:', error)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      alert('Both password fields are required')
      return
    }

    if (newPassword !== confirmNewPassword) {
      alert('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          newPassword: newPassword
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Password has been reset successfully')
        setShowPasswordReset(false)
        setNewPassword('')
        setConfirmNewPassword('')
        await fetchUsers() // Refresh user list
      } else {
        alert(data.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      INVITED: 'bg-blue-100 text-blue-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      DISABLED: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getMethodBadge = (method) => {
    const colors = {
      SYSTEM: 'bg-purple-100 text-purple-800',
      MANUAL: 'bg-green-100 text-green-800',
      INVITE: 'bg-blue-100 text-blue-800',
      REQUEST: 'bg-orange-100 text-orange-800'
    }
    return colors[method] || 'bg-gray-100 text-gray-800'
  }

  const getRoleBadge = (role) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-800',
      USER: 'bg-blue-100 text-blue-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
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
              <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Admin
              </Link>
              <h1 className="text-xl font-semibold">User Management</h1>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add User
            </button>
          </div>

          {/* Create User Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Creation Type</label>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="manual"
                            name="creationType"
                            value="manual"
                            checked={newUser.creationType === 'manual'}
                            onChange={(e) => setNewUser({...newUser, creationType: e.target.value})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="manual" className="ml-2 text-sm text-gray-700">
                            Create user manually (assign password)
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="invite"
                            name="creationType"
                            value="invite"
                            checked={newUser.creationType === 'invite'}
                            onChange={(e) => setNewUser({...newUser, creationType: e.target.value})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="invite" className="ml-2 text-sm text-gray-700">
                            Send invitation (user sets own password)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>

                    {newUser.creationType === 'manual' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Password</label>
                          <input
                            type="password"
                            required
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                          <input
                            type="password"
                            required
                            value={newUser.confirmPassword}
                            onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {showEditModal && editingUser && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User: {editingUser.name}</h3>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">User Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Feature Access */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Feature Access</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-700">Company Search</span>
                          <p className="text-xs text-gray-500">Discover off-market companies</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingUser.features?.companySearch ?? true}
                            onChange={(e) => setEditingUser({
                              ...editingUser,
                              features: { ...editingUser.features, companySearch: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-700">Company Enrichment</span>
                          <p className="text-xs text-gray-500">Enhance company data with contacts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingUser.features?.companyEnrichment ?? true}
                            onChange={(e) => setEditingUser({
                              ...editingUser,
                              features: { ...editingUser.features, companyEnrichment: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-700">Business Intelligence Report</span>
                          <p className="text-xs text-gray-500">AI-powered company analysis</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingUser.features?.businessIntelligence ?? true}
                            onChange={(e) => setEditingUser({
                              ...editingUser,
                              features: { ...editingUser.features, businessIntelligence: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">User Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={handleSuspendUser}
                        className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                          editingUser.status === 'ACTIVE' 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {editingUser.status === 'ACTIVE' ? 'Suspend User' : 'Reactivate User'}
                      </button>

                      {editingUser.method !== 'SYSTEM' && (
                        <button
                          onClick={() => setShowPasswordReset(!showPasswordReset)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Reset Password
                        </button>
                      )}
                      
                      {editingUser.method !== 'SYSTEM' && (
                        <button
                          onClick={() => handleDeleteUser(editingUser.id)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                        >
                          Delete User
                        </button>
                      )}
                    </div>

                    {/* Password Reset Form */}
                    {showPasswordReset && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-md">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Reset Password</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter new password"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Confirm Password</label>
                            <input
                              type="password"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Confirm new password"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleResetPassword}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                            >
                              Update Password
                            </button>
                            <button
                              onClick={() => {
                                setShowPasswordReset(false)
                                setNewPassword('')
                                setConfirmNewPassword('')
                              }}
                              className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleUpdateUser}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingUser(null)
                      setShowPasswordReset(false)
                      setNewPassword('')
                      setConfirmNewPassword('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Details Modal */}
          {showUserDetails && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        User Activity Details
                      </h3>
                      {selectedUserActivity && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedUserActivity.user.name} ({selectedUserActivity.user.email})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={closeUserDetails}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loadingActivity ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading user activity...</p>
                    </div>
                  ) : selectedUserActivity ? (
                    <div className="space-y-6">
                      {/* Activity Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900">Total Companies</h4>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedUserActivity.activity.totalCompanies}
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-green-900">Enriched Companies</h4>
                          <p className="text-2xl font-bold text-green-600">
                            {selectedUserActivity.activity.enrichedCompanies}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-purple-900">Reports Generated</h4>
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedUserActivity.activity.totalReports}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-orange-900">Enrichment Rate</h4>
                          <p className="text-2xl font-bold text-orange-600">
                            {selectedUserActivity.activity.totalCompanies > 0 
                              ? Math.round((selectedUserActivity.activity.enrichedCompanies / selectedUserActivity.activity.totalCompanies) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>

                      {/* Search History */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Search History</h4>
                        {Object.keys(selectedUserActivity.activity.searchHistory).length > 0 ? (
                          <div className="space-y-4">
                            {Object.entries(selectedUserActivity.activity.searchHistory)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([date, companies]) => (
                              <div key={date} className="bg-gray-50 rounded-lg p-4">
                                <h5 className="font-medium text-gray-900 mb-2">
                                  {date} ({companies.length} companies)
                                </h5>
                                <div className="space-y-2">
                                  {companies.slice(0, 5).map((company) => (
                                    <div key={company.id} className="flex justify-between items-center text-sm">
                                      <div>
                                        <span className="font-medium">{company.name}</span>
                                        {company.location && (
                                          <span className="text-gray-500 ml-2">📍 {company.location}</span>
                                        )}
                                        {company.industry && (
                                          <span className="text-gray-500 ml-2">🏢 {company.industry}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {company.rating && (
                                          <span className="text-yellow-500">⭐ {company.rating}</span>
                                        )}
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          company.is_enriched 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {company.is_enriched ? 'Enriched' : 'Basic'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {companies.length > 5 && (
                                    <p className="text-sm text-gray-500 italic">
                                      ... and {companies.length - 5} more companies
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No search history found</p>
                        )}
                      </div>

                      {/* Enriched Companies Details */}
                      {selectedUserActivity.activity.enrichedCompanies > 0 && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Enriched Companies</h4>
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enriched Date</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {selectedUserActivity.activity.companies
                                    .filter(company => company.is_enriched)
                                    .map((company) => (
                                    <tr key={company.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                                          {company.rating && (
                                            <div className="text-sm text-gray-500">
                                              ⭐ {company.rating} ({company.user_ratings_total} reviews)
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {company.city && company.state ? `${company.city}, ${company.state}` : company.location || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {company.industry || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>
                                          {company.phone && <div>📞 {company.phone}</div>}
                                          {company.website && <div>🌐 {company.website}</div>}
                                          {!company.phone && !company.website && 'N/A'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {company.updated_at ? new Date(company.updated_at).toLocaleDateString() : 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reports Generated */}
                      {selectedUserActivity.activity.reports && selectedUserActivity.activity.reports.length > 0 && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Generated Reports</h4>
                          <div className="space-y-2">
                            {selectedUserActivity.activity.reports.map((report) => (
                              <div key={report.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <div>
                                  <span className="font-medium">{report.company_name}</span>
                                  <span className="text-gray-500 ml-2">({report.report_type})</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {report.status}
                                  </span>
                                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Failed to load user activity data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                All Users ({users.length})
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage user access and permissions
              </p>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name?.split(' ').map(n => n[0]).join('') || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className="text-sm font-medium text-gray-900">{user.name}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                            {user.status}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodBadge(user.method)}`}>
                            {user.method}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          Joined: {user.join_date} | Last login: {user.last_login || 'Never'}
                          {user.created_by && ` | Created by: ${user.created_by}`}
                          {user.has_password !== undefined && (user.has_password ? ' | Has Password' : ' | Pending Password')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewUserDetails(user)}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.status === 'ACTIVE').length}
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
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Invited Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.status === 'INVITED' || u.status === 'PENDING').length}
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
                    <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👤</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Standard Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.role === 'USER').length}
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
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👑</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Admin Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.role === 'ADMIN').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}