import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')
  
  try {
    // 1. Create test database schema if needed
    console.log('📋 Ensuring test database schema...')
    
    // 2. Create essential test data
    console.log('👥 Creating test users...')
    
    // Create admin user
    const { error: adminError } = await supabase
      .from('users')
      .upsert({
        id: 'test-admin-id',
        email: 'admin@exitschool.com',
        name: 'Test Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        company_name: 'Exit School',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })

    if (adminError && !adminError.message.includes('duplicate')) {
      console.warn('Admin user setup warning:', adminError)
    }

    // Create standard test user
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE',
        company_name: 'Test Company',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })

    if (userError && !userError.message.includes('duplicate')) {
      console.warn('Test user setup warning:', userError)
    }

    // 3. Create email templates for testing
    console.log('📧 Setting up email templates...')
    
    const { error: templateError } = await supabase
      .from('email_templates')
      .upsert([
        {
          id: 'test-template-1',
          user_id: 'test-user-id',
          name: 'Test Campaign Template',
          type: 'CAMPAIGN',
          subject: 'Test Partnership Opportunity',
          content: 'Hello {{recipient_name}}, this is a test email from {{sender_name}}.',
          variables: ['recipient_name', 'sender_name'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' })

    if (templateError && !templateError.message.includes('duplicate')) {
      console.warn('Email template setup warning:', templateError)
    }

    // 4. Set up test API keys and configurations
    console.log('🔧 Validating test configuration...')
    
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`)
        process.exit(1)
      }
    }

    // 5. Clean up any existing test data that might interfere
    console.log('🧹 Cleaning up previous test data...')
    
    // Clean up temporary test users (but keep the main test users)
    await supabase
      .from('invitations')
      .delete()
      .like('email', '%test-temp-%')

    await supabase
      .from('users')
      .delete()
      .like('email', '%test-temp-%')

    // Clean up old test searches and companies
    await supabase
      .from('companies')
      .delete()
      .in('user_id', ['test-user-id', 'test-admin-id'])
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours

    await supabase
      .from('searches')
      .delete()
      .in('user_id', ['test-user-id', 'test-admin-id'])
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours

    // 6. Verify database connection
    console.log('🏥 Testing database connection...')
    
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (healthError) {
      console.error('❌ Database connection failed:', healthError)
      process.exit(1)
    }

    console.log('✅ E2E test environment setup complete!')
    console.log(`📊 Found ${healthCheck?.length || 0} users in test database`)
    
    // Store test configuration for tests to use
    process.env.TEST_ADMIN_ID = 'test-admin-id'
    process.env.TEST_USER_ID = 'test-user-id'
    process.env.TEST_ADMIN_EMAIL = 'admin@exitschool.com'
    process.env.TEST_USER_EMAIL = 'test@example.com'

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    process.exit(1)
  }
}

export default globalSetup