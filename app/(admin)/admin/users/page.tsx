'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import { formatDistanceToNow } from 'date-fns'
import { User, Mail, Building, Clock, Check, X, AlertCircle } from 'lucide-react'

type Supabase = Database
type User = Database['public']['Tables']['users']['Row']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    loadUsers()

    // Subscribe to user changes
    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'users' 
        },
        () => {
          loadUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function approveUser(user: User) {
    if (processingIds.has(user.id)) return
    
    setProcessingIds(prev => new Set(prev).add(user.id))

    try {
      // Generate invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser()

      if (!adminUser) {
        throw new Error('Admin user not found')
      }

      // Update user status to APPROVED
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'APPROVED',
          approved_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Create invitation record
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          approved_by: adminUser.id,
          created_at: new Date().toISOString()
        })

      if (inviteError) throw inviteError

      // Create audit log
      await supabase.rpc('create_audit_log', {
        p_user_id: adminUser.id,
        p_action: 'USER_APPROVED',
        p_entity: 'USER',
        p_entity_id: user.id,
        p_metadata: {
          approved_user_email: user.email,
          invitation_token: token,
          expires_at: expiresAt.toISOString()
        }
      })

      // Send invitation email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: { 
          userId: user.id,
          token,
          userEmail: user.email,
          userName: user.name
        }
      })

      if (emailError) {
        console.error('Email sending error:', emailError)
        // Don't fail the approval, just warn
        toast({
          title: 'User approved',
          description: 'User approved but invitation email failed to send. Please contact the user manually.',
          variant: 'default'
        })
      } else {
        toast({
          title: 'User approved',
          description: `Invitation sent to ${user.email}`
        })
      }

    } catch (error) {
      console.error('Error approving user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve user',
        variant: 'destructive'
      })
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  async function rejectUser(user: User) {
    if (processingIds.has(user.id)) return
    
    setProcessingIds(prev => new Set(prev).add(user.id))

    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser()

      if (!adminUser) {
        throw new Error('Admin user not found')
      }

      // Update user status to DISABLED
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'DISABLED',
          disabled_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Create audit log
      await supabase.rpc('create_audit_log', {
        p_user_id: adminUser.id,
        p_action: 'USER_REJECTED',
        p_entity: 'USER',
        p_entity_id: user.id,
        p_metadata: {
          rejected_user_email: user.email,
          reason: 'Admin rejection'
        }
      })

      toast({
        title: 'User rejected',
        description: `${user.email} has been rejected`
      })

    } catch (error) {
      console.error('Error rejecting user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject user',
        variant: 'destructive'
      })
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  function getStatusBadge(status: User['status']) {
    const variants = {
      REQUESTED: { variant: 'secondary' as const, color: 'text-yellow-600' },
      APPROVED: { variant: 'outline' as const, color: 'text-blue-600' },
      ACTIVE: { variant: 'default' as const, color: 'text-green-600' },
      DISABLED: { variant: 'destructive' as const, color: 'text-red-600' }
    }

    const config = variants[status] || variants.REQUESTED

    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    )
  }

  function UserTable({ users, showActions }: { users: User[], showActions: boolean }) {
    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No users in this category</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              {showActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{user.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-3 w-3 mr-1" />
                    {user.company_name || 'Not specified'}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveUser(user)}
                        disabled={processingIds.has(user.id)}
                        className="flex items-center"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {processingIds.has(user.id) ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectUser(user)}
                        disabled={processingIds.has(user.id)}
                        className="flex items-center"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading users...</div>
      </div>
    )
  }

  const requestedUsers = users.filter(u => u.status === 'REQUESTED')
  const approvedUsers = users.filter(u => u.status === 'APPROVED')
  const activeUsers = users.filter(u => u.status === 'ACTIVE')
  const disabledUsers = users.filter(u => u.status === 'DISABLED')

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage user access and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{requestedUsers.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">{approvedUsers.length}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeUsers.length}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disabled</p>
                <p className="text-2xl font-bold text-red-600">{disabledUsers.length}</p>
              </div>
              <X className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="requested" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="requested">
            Pending Requests ({requestedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="disabled">
            Disabled ({disabledUsers.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="requested">
          <UserTable users={requestedUsers} showActions={true} />
        </TabsContent>
        
        <TabsContent value="approved">
          <UserTable users={approvedUsers} showActions={false} />
        </TabsContent>
        
        <TabsContent value="active">
          <UserTable users={activeUsers} showActions={false} />
        </TabsContent>
        
        <TabsContent value="disabled">
          <UserTable users={disabledUsers} showActions={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}