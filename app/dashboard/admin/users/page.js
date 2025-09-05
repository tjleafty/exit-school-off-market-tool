'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'System Administrator',
      email: 'admin@exitschool.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinDate: '2025-01-01',
      lastLogin: '2025-01-05',
      createdBy: 'System',
      method: 'SYSTEM'
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER',
    password: '',
    confirmPassword: '',
    creationType: 'manual', // 'manual' or 'invite'
    sendInvite: false
  })

  // Load users from localStorage on component mount
  useEffect(() => {
    const savedUsers = localStorage.getItem('exit-school-users')
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers)
        setUsers(parsed)
      } catch (error) {
        console.error('Error loading saved users:', error)
      }
    }
  }, [])

  // Save users to localStorage whenever users change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('exit-school-users', JSON.stringify(users))
    }
  }, [users])

  const handleCreateUser = (e) => {
    e.preventDefault()
    
    // Validation
    if (!newUser.name || !newUser.email) {
      alert('Name and email are required')
      return
    }
    
    if (newUser.creationType === 'manual' && (!newUser.password || newUser.password !== newUser.confirmPassword)) {
      alert('Password and confirmation must match')
      return
    }
    
    // Check if email already exists
    if (users.find(user => user.email === newUser.email)) {
      alert('User with this email already exists')
      return
    }
    
    // Create new user object
    const user = {
      id: Date.now(), // Simple ID generation
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.creationType === 'manual' ? 'ACTIVE' : 'INVITED',
      joinDate: new Date().toISOString().split('T')[0],
      lastLogin: newUser.creationType === 'manual' ? 'Never' : 'Pending',
      createdBy: 'Admin',
      method: newUser.creationType === 'manual' ? 'MANUAL' : 'INVITE',
      hasPassword: newUser.creationType === 'manual'
    }
    
    // Add user to list
    setUsers(prev => [...prev, user])
    
    // Reset form
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
    
    console.log('User created:', user)
  }

  const getStatusBadge = (status) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      INVITED: 'bg-blue-100 text-blue-800',
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
                            {user.name.split(' ').map(n => n[0]).join('')}
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
                          Joined: {user.joinDate} | Last login: {user.lastLogin}
                          {user.createdBy && ` | Created by: ${user.createdBy}`}
                          {user.hasPassword !== undefined && (user.hasPassword ? ' | Has Password' : ' | Pending Password')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">
                        Edit
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
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