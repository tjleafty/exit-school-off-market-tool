#!/usr/bin/env node

/**
 * Check Admin User Status
 * Verifies if the admin user exists and is properly configured
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkAdminUser() {
  try {
    log('cyan', '🔍 Checking Admin User Status...')
    log('cyan', '=' .repeat(40))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check auth users
    log('blue', 'Checking auth.users table...')
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const adminAuthUser = authUsers?.users?.find(user => user.email === 'admin@exitschool.com')

    if (!adminAuthUser) {
      log('red', '❌ Admin user not found in auth.users')
      return false
    }

    log('green', `✅ Auth user found: ${adminAuthUser.id}`)
    log('blue', `   Email: ${adminAuthUser.email}`)
    log('blue', `   Created: ${adminAuthUser.created_at}`)
    log('blue', `   Confirmed: ${adminAuthUser.email_confirmed_at ? 'Yes' : 'No'}`)

    // Check user profile
    log('blue', '\nChecking users table profile...')
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminAuthUser.id)
      .single()

    if (profileError) {
      log('yellow', `⚠️  Profile error: ${profileError.message}`)
      
      // Try to create the profile
      log('blue', 'Attempting to create user profile...')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: adminAuthUser.id,
          email: 'admin@exitschool.com',
          full_name: 'System Administrator',
          company_name: 'Exit School',
          role: 'ADMIN',
          status: 'ACTIVE',
          email_verified: true,
        })

      if (insertError) {
        log('red', `❌ Failed to create profile: ${insertError.message}`)
        return false
      } else {
        log('green', '✅ User profile created successfully')
      }
    } else {
      log('green', '✅ User profile found')
      log('blue', `   ID: ${userProfile.id}`)
      log('blue', `   Email: ${userProfile.email}`)
      log('blue', `   Name: ${userProfile.full_name}`)
      log('blue', `   Company: ${userProfile.company_name}`)
      log('blue', `   Role: ${userProfile.role}`)
      log('blue', `   Status: ${userProfile.status}`)
      
      // Update to ensure admin role and active status
      if (userProfile.role !== 'ADMIN' || userProfile.status !== 'ACTIVE') {
        log('yellow', '⚠️  Updating admin role and status...')
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'ADMIN',
            status: 'ACTIVE',
            full_name: 'System Administrator',
            company_name: 'Exit School',
            email_verified: true,
          })
          .eq('id', adminAuthUser.id)

        if (updateError) {
          log('red', `❌ Failed to update profile: ${updateError.message}`)
          return false
        } else {
          log('green', '✅ Admin profile updated successfully')
        }
      }
    }

    // Final verification
    log('blue', '\nFinal verification...')
    const { data: finalProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminAuthUser.id)
      .single()

    if (finalProfile?.role === 'ADMIN' && finalProfile?.status === 'ACTIVE') {
      log('green', '🎉 Admin user is properly configured!')
      log('cyan', '\n📝 Admin Login Credentials:')
      log('yellow', '   Email: admin@exitschool.com')
      log('yellow', '   Password: password')
      return true
    } else {
      log('red', '❌ Admin user configuration incomplete')
      return false
    }

  } catch (error) {
    log('red', `❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  const success = await checkAdminUser()
  process.exit(success ? 0 : 1)
}

main()