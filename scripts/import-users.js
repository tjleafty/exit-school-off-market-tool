#!/usr/bin/env node

/**
 * Bulk User Import Script
 * Imports multiple users from a CSV file
 *
 * CSV Format (with header):
 * email,full_name,company_name,role
 * user1@example.com,John Doe,Company A,USER
 * admin@example.com,Jane Admin,Company B,ADMIN
 *
 * Usage:
 *   node scripts/import-users.js users.csv
 *   node scripts/import-users.js users.csv --password=TempPass123
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Default password for all new users
const DEFAULT_PASSWORD = process.argv.find(arg => arg.startsWith('--password='))?.split('=')[1] || 'ChangeMe123!'

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

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim())
    const user = {}

    headers.forEach((header, i) => {
      user[header] = values[i] || ''
    })

    user.lineNumber = index + 2 // +2 because of header and 0-based index
    return user
  })
}

function validateUser(user) {
  const errors = []

  if (!user.email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('Invalid email format')
  }

  if (!user.full_name) {
    errors.push('Full name is required')
  }

  if (user.role && !['USER', 'ADMIN'].includes(user.role.toUpperCase())) {
    errors.push('Role must be USER or ADMIN')
  }

  return errors
}

async function createUser(supabase, userData, index, total) {
  const { email, full_name, company_name, role } = userData
  const userRole = role ? role.toUpperCase() : 'USER'

  try {
    log('blue', `\n[${index + 1}/${total}] Processing: ${email}`)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(u => u.email === email)

    if (userExists) {
      log('yellow', `  ⚠️  User already exists, skipping...`)
      return { success: false, skipped: true, email, reason: 'Already exists' }
    }

    // Create auth user
    log('gray', '  Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_name
      }
    })

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`)
    }

    // Update user profile (trigger already created it, we just need to update role/status)
    log('gray', '  Updating user profile...')

    // Small delay to ensure trigger has completed
    await new Promise(resolve => setTimeout(resolve, 100))

    const { error: profileError } = await supabase
      .from('users')
      .update({
        full_name,
        company_name: company_name || null,
        role: userRole,
        status: 'ACTIVE',
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      // Cleanup auth user if profile update failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Profile update failed: ${profileError.message}`)
    }

    log('green', `  ✅ Created successfully (Role: ${userRole})`)
    return { success: true, email, role: userRole }

  } catch (error) {
    log('red', `  ❌ Failed: ${error.message}`)
    return { success: false, email, error: error.message }
  }
}

async function main() {
  try {
    log('cyan', '╔════════════════════════════════════════╗')
    log('cyan', '║     Bulk User Import Tool              ║')
    log('cyan', '╚════════════════════════════════════════╝')
    console.log('')

    // Check for CSV file argument
    const csvFile = process.argv[2]
    if (!csvFile) {
      log('red', '❌ Error: CSV file path required')
      console.log('')
      log('yellow', 'Usage:')
      log('gray', '  node scripts/import-users.js users.csv')
      log('gray', '  node scripts/import-users.js users.csv --password=CustomPass123')
      console.log('')
      log('yellow', 'CSV Format:')
      log('gray', '  email,full_name,company_name,role')
      log('gray', '  user@example.com,John Doe,ACME Corp,USER')
      log('gray', '  admin@example.com,Jane Admin,ACME Corp,ADMIN')
      process.exit(1)
    }

    // Read CSV file
    const csvPath = path.resolve(csvFile)
    if (!fs.existsSync(csvPath)) {
      log('red', `❌ File not found: ${csvPath}`)
      process.exit(1)
    }

    log('blue', `📄 Reading CSV file: ${csvPath}`)
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const users = parseCSV(csvContent)

    log('green', `✅ Found ${users.length} users to import`)
    log('yellow', `🔑 Default password: ${DEFAULT_PASSWORD}`)
    console.log('')

    // Validate all users first
    log('blue', '🔍 Validating users...')
    const validationErrors = []
    users.forEach(user => {
      const errors = validateUser(user)
      if (errors.length > 0) {
        validationErrors.push({ line: user.lineNumber, email: user.email, errors })
      }
    })

    if (validationErrors.length > 0) {
      log('red', `\n❌ Found ${validationErrors.length} validation errors:`)
      validationErrors.forEach(({ line, email, errors }) => {
        log('yellow', `  Line ${line} (${email}):`)
        errors.forEach(err => log('red', `    - ${err}`))
      })
      process.exit(1)
    }

    log('green', '✅ All users validated')

    // Initialize Supabase
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

    log('blue', '\n🚀 Starting user import...')

    // Import users
    const results = {
      successful: [],
      skipped: [],
      failed: []
    }

    for (let i = 0; i < users.length; i++) {
      const result = await createUser(supabase, users[i], i, users.length)

      if (result.success) {
        results.successful.push(result)
      } else if (result.skipped) {
        results.skipped.push(result)
      } else {
        results.failed.push(result)
      }

      // Small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Print summary
    console.log('')
    log('cyan', '╔════════════════════════════════════════╗')
    log('cyan', '║          Import Summary                ║')
    log('cyan', '╚════════════════════════════════════════╝')
    console.log('')
    log('green', `✅ Successfully created: ${results.successful.length}`)
    log('yellow', `⚠️  Skipped (existing):  ${results.skipped.length}`)
    log('red', `❌ Failed:               ${results.failed.length}`)
    console.log('')

    if (results.successful.length > 0) {
      log('blue', 'Successfully created users:')
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
    log('gray', `  • All users created with password: ${DEFAULT_PASSWORD}`)
    log('gray', '  • Users should change password on first login')
    log('gray', '  • All users are set to ACTIVE status')
    console.log('')

    if (results.failed.length > 0) {
      log('yellow', '⚠️  Some users failed to import')
      process.exit(1)
    } else {
      log('green', '✅ Import completed successfully!')
    }

  } catch (error) {
    console.log('')
    log('red', `💥 Import failed: ${error.message}`)
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

module.exports = { parseCSV, validateUser, createUser }
