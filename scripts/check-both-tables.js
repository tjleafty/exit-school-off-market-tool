#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('Checking app_users table...')
  const { data: appUsers, error: appError } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })

  if (appError) {
    console.error('Error fetching app_users:', appError.message)
  } else {
    console.log(`\nFound ${appUsers.length} users in app_users table:`)
    appUsers.forEach(u => {
      console.log(`  - ${u.email.padEnd(40)} | ${u.name.padEnd(30)} | ${u.role} | ${u.status}`)
    })
  }

  console.log('\n\nChecking users table...')
  const { data: realUsers, error: realError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (realError) {
    console.error('Error fetching users:', realError.message)
  } else {
    console.log(`\nFound ${realUsers.length} users in users table:`)
    realUsers.forEach(u => {
      console.log(`  - ${u.email.padEnd(40)} | ${u.full_name?.padEnd(30)} | ${u.role} | ${u.status}`)
    })
  }

  // Find users in app_users but not in users
  if (!appError && !realError) {
    const realEmails = new Set(realUsers.map(u => u.email.toLowerCase()))
    const missingUsers = appUsers.filter(u => !realEmails.has(u.email.toLowerCase()))

    if (missingUsers.length > 0) {
      console.log(`\n\n⚠️  Found ${missingUsers.length} users in app_users that don't exist in users table:`)
      missingUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - ${u.role} - ${u.status}`)
      })
    } else {
      console.log('\n\n✅ All app_users exist in users table')
    }
  }
}

main().catch(console.error)
