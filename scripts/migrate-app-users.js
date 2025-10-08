#!/usr/bin/env node

/**
 * Migrate app_users to real Supabase Auth users
 * Creates auth accounts for users that only exist in app_users table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const DEFAULT_PASSWORD = 'password' // Temporary password for migrated users

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  log('cyan', '╔════════════════════════════════════════╗')
  log('cyan', '║   Migrate app_users to Auth Users     ║')
  log('cyan', '╚════════════════════════════════════════╝')
  console.log('')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Get all app_users
  log('blue', 'Fetching users from app_users table...')
  const { data: appUsers, error: appError } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })

  if (appError) {
    log('red', `Error: ${appError.message}`)
    process.exit(1)
  }

  log('green', `✅ Found ${appUsers.length} users in app_users table`)

  // Get all real users
  log('blue', 'Fetching users from users table...')
  const { data: realUsers, error: realError } = await supabase
    .from('users')
    .select('*')

  if (realError) {
    log('red', `Error: ${realError.message}`)
    process.exit(1)
  }

  log('green', `✅ Found ${realUsers.length} users in users table`)

  // Find users to migrate
  const realEmails = new Set(realUsers.map(u => u.email.toLowerCase()))
  const usersToMigrate = appUsers.filter(u => !realEmails.has(u.email.toLowerCase()))

  if (usersToMigrate.length === 0) {
    log('green', '\n✅ No users need migration - all app_users already exist in users table')
    return
  }

  log('yellow', `\n📋 Found ${usersToMigrate.length} users to migrate:\n`)
  usersToMigrate.forEach(u => {
    log('gray', `  - ${u.email} (${u.name}) - ${u.role}`)
  })

  console.log('')
  log('blue', '🚀 Starting migration...')
  log('yellow', `🔑 Default password for all migrated users: ${DEFAULT_PASSWORD}`)
  console.log('')

  const results = {
    successful: [],
    failed: []
  }

  for (let i = 0; i < usersToMigrate.length; i++) {
    const user = usersToMigrate[i]
    log('blue', `\n[${i + 1}/${usersToMigrate.length}] Migrating: ${user.email}`)

    try {
      // Create auth user
      log('gray', '  Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: user.name
        }
      })

      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`)
      }

      // Update user profile (trigger creates it, we update it)
      log('gray', '  Updating user profile...')
      await new Promise(resolve => setTimeout(resolve, 100))

      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: user.name,
          role: user.role,
          status: user.status,
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id)

      if (profileError) {
        // Cleanup auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw new Error(`Profile update failed: ${profileError.message}`)
      }

      log('green', `  ✅ Migrated successfully`)
      results.successful.push({ email: user.email, role: user.role })

      // Small delay to avoid rate limiting
      if (i < usersToMigrate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

    } catch (error) {
      log('red', `  ❌ Failed: ${error.message}`)
      results.failed.push({ email: user.email, error: error.message })
    }
  }

  // Print summary
  console.log('')
  log('cyan', '╔════════════════════════════════════════╗')
  log('cyan', '║        Migration Summary               ║')
  log('cyan', '╚════════════════════════════════════════╝')
  console.log('')
  log('green', `✅ Successfully migrated: ${results.successful.length}`)
  log('red', `❌ Failed:               ${results.failed.length}`)
  console.log('')

  if (results.successful.length > 0) {
    log('blue', 'Successfully migrated users:')
    results.successful.forEach(({ email, role }) => {
      log('gray', `  • ${email} (${role})`)
    })
    console.log('')
  }

  if (results.failed.length > 0) {
    log('red', 'Failed users:')
    results.failed.forEach(({ email, error }) => {
      log('gray', `  • ${email}`)
      log('red', `    ${error}`)
    })
    console.log('')
  }

  log('yellow', '📝 Important Notes:')
  log('gray', `  • All migrated users have password: ${DEFAULT_PASSWORD}`)
  log('gray', '  • Users should change password after first login')
  log('gray', '  • Original app_users records are preserved')
  console.log('')

  if (results.failed.length > 0) {
    log('yellow', '⚠️  Some users failed to migrate')
    process.exit(1)
  } else {
    log('green', '✅ Migration completed successfully!')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
