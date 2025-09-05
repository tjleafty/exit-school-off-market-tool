#!/usr/bin/env node

/**
 * Fix Admin User Script
 * Finds and fixes the admin user configuration
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

async function fixAdminUser() {
  try {
    log('cyan', '🔧 Fixing Admin User Configuration...')
    log('cyan', '=' .repeat(40))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get all users with admin email
    log('blue', 'Looking for admin users...')
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const adminUsers = authUsers?.users?.filter(user => 
      user.email === 'admin@exitschool.com'
    ) || []

    log('blue', `Found ${adminUsers.length} auth users with admin email`)

    if (adminUsers.length === 0) {
      log('red', '❌ No admin users found in auth.users')
      return false
    }

    // Use the most recent admin user
    const adminUser = adminUsers[adminUsers.length - 1]
    log('green', `✅ Using admin user: ${adminUser.id}`)

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminUser.id)
      .single()

    if (existingProfile) {
      log('green', '✅ User profile exists')
      log('blue', `   Current role: ${existingProfile.role}`)
      log('blue', `   Current status: ${existingProfile.status}`)
      
      // Update to ensure admin privileges
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'ADMIN',
          status: 'ACTIVE',
          full_name: 'System Administrator',
          company_name: 'Exit School',
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id)

      if (updateError) {
        log('red', `❌ Failed to update profile: ${updateError.message}`)
        return false
      }

      log('green', '✅ Admin profile updated successfully')
    } else {
      log('yellow', '⚠️  No user profile found, creating one...')
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: adminUser.id,
          email: 'admin@exitschool.com',
          full_name: 'System Administrator', 
          company_name: 'Exit School',
          role: 'ADMIN',
          status: 'ACTIVE',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        log('red', `❌ Failed to create profile: ${insertError.message}`)
        return false
      }

      log('green', '✅ Admin profile created successfully')
    }

    // Final verification
    const { data: finalProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminUser.id)
      .single()

    log('cyan', '\n📊 Final Admin User Configuration:')
    log('green', `✅ ID: ${finalProfile.id}`)
    log('green', `✅ Email: ${finalProfile.email}`)
    log('green', `✅ Name: ${finalProfile.full_name}`)
    log('green', `✅ Company: ${finalProfile.company_name}`)
    log('green', `✅ Role: ${finalProfile.role}`)
    log('green', `✅ Status: ${finalProfile.status}`)
    log('green', `✅ Email Verified: ${finalProfile.email_verified}`)

    if (finalProfile.role === 'ADMIN' && finalProfile.status === 'ACTIVE') {
      log('green', '\n🎉 Admin user is ready!')
      log('cyan', '\n📝 Login Credentials:')
      log('yellow', '   Email: admin@exitschool.com')
      log('yellow', '   Password: password')
      log('blue', '\nYou can now:')
      log('blue', '1. Visit your deployed application')
      log('blue', '2. Click "Sign In"')
      log('blue', '3. Use the credentials above')
      log('blue', '4. Access the admin dashboard')
      return true
    } else {
      log('red', '❌ Admin configuration still incomplete')
      return false
    }

  } catch (error) {
    log('red', `❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  const success = await fixAdminUser()
  process.exit(success ? 0 : 1)
}

main()