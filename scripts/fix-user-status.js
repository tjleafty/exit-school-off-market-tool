#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const email = 'krayvarble@gmail.com'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log(`Updating ${email} to ACTIVE status...`)

  const { error } = await supabase
    .from('users')
    .update({ status: 'ACTIVE' })
    .eq('email', email)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Updated successfully')
  }
}

main().catch(console.error)
