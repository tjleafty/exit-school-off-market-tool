#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function listAllUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Environment check:')
  console.log('URL:', supabaseUrl)
  console.log('Service key exists:', !!serviceRoleKey)
  console.log('Service key starts with:', serviceRoleKey?.substring(0, 20) + '...')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('\n🔍 Checking auth.users...')
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Auth error:', authError)
      return
    }

    console.log(`Found ${authData?.users?.length || 0} auth users:`)
    authData?.users?.forEach(user => {
      console.log(`  - ${user.email} (${user.id}) - Created: ${user.created_at}`)
    })

    console.log('\n🔍 Checking public.users...')
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')

    if (profileError) {
      console.error('Profile error:', profileError)
      return
    }

    console.log(`Found ${profileData?.length || 0} user profiles:`)
    profileData?.forEach(user => {
      console.log(`  - ${user.email} (${user.id}) - Role: ${user.role}, Status: ${user.status}`)
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

listAllUsers()