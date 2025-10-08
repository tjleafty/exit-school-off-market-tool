#!/usr/bin/env node

/**
 * Cleanup Orphaned Auth Users
 * Removes auth users that were created but don't have corresponding profiles
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('Fetching all auth users...')
  const { data: authUsers } = await supabase.auth.admin.listUsers()

  console.log('Fetching all user profiles...')
  const { data: profiles } = await supabase.from('users').select('id, email')

  const profileIds = new Set(profiles.map(p => p.id))
  const orphanedUsers = authUsers.users.filter(u => !profileIds.has(u.id))

  console.log(`\nFound ${orphanedUsers.length} orphaned auth users`)

  for (const user of orphanedUsers) {
    console.log(`Deleting: ${user.email}`)
    await supabase.auth.admin.deleteUser(user.id)
  }

  console.log('\nCleanup complete!')
}

main().catch(console.error)
