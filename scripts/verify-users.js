#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('Checking auth.users...')
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log(`Auth users: ${authUsers.users.length}`)

  console.log('\nChecking public.users table...')
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role, status')
    .order('email')

  console.log(`Database users: ${dbUsers.length}`)

  console.log('\nUser details:')
  dbUsers.forEach(u => {
    const authUser = authUsers.users.find(au => au.id === u.id)
    const hasAuth = authUser ? '✓' : '✗'
    console.log(`${hasAuth} ${u.email.padEnd(40)} | ${u.role.padEnd(6)} | ${u.status}`)
  })

  // Check for mismatches
  const dbEmails = new Set(dbUsers.map(u => u.email))
  const authEmails = new Set(authUsers.users.map(u => u.email))

  const inAuthNotDB = authUsers.users.filter(u => !dbEmails.has(u.email))
  const inDBNotAuth = dbUsers.filter(u => !authEmails.has(u.email))

  if (inAuthNotDB.length > 0) {
    console.log('\n⚠️  Users in auth but not in database:')
    inAuthNotDB.forEach(u => console.log(`  - ${u.email}`))
  }

  if (inDBNotAuth.length > 0) {
    console.log('\n⚠️  Users in database but not in auth:')
    inDBNotAuth.forEach(u => console.log(`  - ${u.email}`))
  }

  // Test login for one user
  console.log('\n\nTesting login for mlopez205@gmail.com...')
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'mlopez205@gmail.com',
    password: 'password'
  })

  if (loginError) {
    console.log('❌ Login failed:', loginError.message)
  } else {
    console.log('✅ Login successful!')
    console.log('User ID:', loginData.user.id)
  }
}

main().catch(console.error)
