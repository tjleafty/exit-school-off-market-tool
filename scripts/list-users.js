#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: users } = await supabase
    .from('users')
    .select('email, full_name, role, status')
    .order('email')

  console.log(`\nTotal users: ${users.length}\n`)
  users.forEach(u => {
    console.log(`${u.email.padEnd(40)} | ${u.full_name.padEnd(30)} | ${u.role.padEnd(6)} | ${u.status}`)
  })
}

main().catch(console.error)
