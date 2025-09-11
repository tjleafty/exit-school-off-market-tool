#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the initial admin user with specified credentials
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuration
const ADMIN_EMAIL = 'admin@exitschool.com'
const ADMIN_PASSWORD = 'password'
const ADMIN_NAME = 'System Administrator'
const COMPANY_NAME = 'Exit School'

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

async function createAdminUser() {
  try {
    log('cyan', '🔧 Creating Admin User...')
    log('cyan', '=' .repeat(40))

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    log('blue', 'Checking if admin user already exists...')
    
    // Check if admin user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const adminExists = existingUser?.users?.some(user => user.email === ADMIN_EMAIL)

    if (adminExists) {
      log('yellow', '⚠️  Admin user already exists!')
      
      // Update the existing user to ensure it's active and has admin role
      const adminUser = existingUser.users.find(user => user.email === ADMIN_EMAIL)
      
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: adminUser.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          company_name: COMPANY_NAME,
          role: 'ADMIN',
          status: 'ACTIVE',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (updateError) {
        console.error('Error updating admin user profile:', updateError)
      } else {
        log('green', '✅ Admin user profile updated successfully')
      }
      
      return { user: adminUser, created: false }
    }

    log('blue', 'Creating new admin user...')

    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: ADMIN_NAME,
        company_name: COMPANY_NAME
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    log('green', '✅ Auth user created successfully')
    log('blue', 'Creating user profile...')

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: ADMIN_EMAIL,
        full_name: ADMIN_NAME,
        company_name: COMPANY_NAME,
        role: 'ADMIN',
        status: 'ACTIVE',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Try to clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    log('green', '✅ User profile created successfully')
    
    return { user: authData.user, created: true }

  } catch (error) {
    log('red', `❌ Error: ${error.message}`)
    throw error
  }
}

async function verifyAdminUser() {
  try {
    log('cyan', '🔍 Verifying Admin User...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single()

    if (profileError) {
      throw new Error(`Failed to get user profile: ${profileError.message}`)
    }

    log('green', '✅ Admin user verification successful')
    log('blue', `   ID: ${userProfile.id}`)
    log('blue', `   Email: ${userProfile.email}`)
    log('blue', `   Name: ${userProfile.full_name}`)
    log('blue', `   Company: ${userProfile.company_name}`)
    log('blue', `   Role: ${userProfile.role}`)
    log('blue', `   Status: ${userProfile.status}`)

    return userProfile

  } catch (error) {
    log('red', `❌ Verification failed: ${error.message}`)
    throw error
  }
}

async function main() {
  try {
    log('cyan', '🚀 Admin User Setup')
    log('cyan', '=' .repeat(40))
    
    const result = await createAdminUser()
    
    if (result.created) {
      log('green', '🎉 Admin user created successfully!')
    } else {
      log('green', '🎉 Admin user already exists and is configured!')
    }
    
    console.log('')
    await verifyAdminUser()
    
    console.log('')
    log('cyan', '📝 Admin Login Credentials:')
    log('yellow', `   Email: ${ADMIN_EMAIL}`)
    log('yellow', `   Password: ${ADMIN_PASSWORD}`)
    
    console.log('')
    log('green', '✅ Setup completed successfully!')
    log('blue', '')
    log('blue', 'Next steps:')
    log('blue', '1. Deploy your application')
    log('blue', '2. Navigate to /login')
    log('blue', '3. Sign in with the admin credentials above')
    log('blue', '4. Access the admin dashboard to manage users')

  } catch (error) {
    log('red', '💥 Setup failed!')
    process.exit(1)
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { createAdminUser, verifyAdminUser }