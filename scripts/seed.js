#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with sample data for development and testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Sample data
const SAMPLE_DATA = {
  // Admin user for testing
  admin_user: {
    email: 'admin@exitschool.com',
    name: 'Admin User',
    role: 'ADMIN',
    status: 'ACTIVE',
    company_name: 'Exit School'
  },
  
  // Test user
  test_user: {
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    company_name: 'Test Company'
  },
  
  // Sample industries for searches
  industries: [
    'Restaurants', 'Auto Repair', 'Dental Practices', 'Hair Salons',
    'Fitness Centers', 'Retail Stores', 'Professional Services',
    'Healthcare', 'Technology', 'Manufacturing'
  ],
  
  // Sample cities
  cities: [
    { city: 'Seattle', state: 'WA' },
    { city: 'Portland', state: 'OR' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Denver', state: 'CO' },
    { city: 'Austin', state: 'TX' }
  ],
  
  // Sample companies
  companies: [
    {
      name: 'Acme Pizza Co',
      website: 'https://acmepizza.com',
      phone: '(555) 123-4567',
      address: '123 Main St, Seattle, WA 98101',
      rating: 4.5,
      review_count: 127,
      place_id: 'ChIJExample1'
    },
    {
      name: 'Best Auto Repair',
      website: 'https://bestautorépair.com',
      phone: '(555) 234-5678',
      address: '456 Oak Ave, Portland, OR 97201',
      rating: 4.8,
      review_count: 89,
      place_id: 'ChIJExample2'
    },
    {
      name: 'Bright Smile Dentistry',
      website: 'https://brightsmile.com',
      phone: '(555) 345-6789',
      address: '789 Pine St, San Francisco, CA 94102',
      rating: 4.9,
      review_count: 203,
      place_id: 'ChIJExample3'
    }
  ],
  
  // Sample email templates
  email_templates: [
    {
      name: 'Partnership Outreach',
      type: 'CAMPAIGN',
      subject: 'Partnership Opportunity with {{sender_company}}',
      content: `Hi {{recipient_name}},

I hope this email finds you well. I'm reaching out from {{sender_company}} because I believe there might be a great partnership opportunity between our companies.

We work with businesses in {{industry}} sector and have been impressed with {{company_name}}'s presence in {{city}}. Your {{rating}}-star rating speaks volumes about the quality of your work.

I'd love to schedule a brief 15-minute call to discuss how we might be able to help each other grow our businesses.

Would you be open to a quick conversation this week?

Best regards,
{{sender_name}}`,
      variables: ['recipient_name', 'sender_company', 'company_name', 'industry', 'city', 'rating', 'sender_name'],
      is_active: true
    },
    {
      name: 'Service Introduction',
      type: 'CAMPAIGN', 
      subject: 'Helping {{industry}} businesses like {{company_name}} grow',
      content: `Hello {{recipient_name}},

I came across {{company_name}} while researching successful {{industry}} businesses in {{city}}, {{state}}.

We specialize in helping businesses like yours increase their revenue through strategic partnerships and lead generation. Our clients typically see a 20-30% increase in qualified leads within the first 90 days.

I'd be happy to share some case studies of how we've helped similar businesses in your area.

Are you available for a brief call this week to discuss your current growth goals?

Best,
{{sender_name}}`,
      variables: ['recipient_name', 'company_name', 'industry', 'city', 'state', 'sender_name'],
      is_active: true
    }
  ],
  
  // Sample campaigns
  campaigns: [
    {
      name: 'Seattle Restaurant Outreach',
      industry: 'Restaurants',
      status: 'ACTIVE',
      is_active: true,
      max_sends: 3,
      weekday: 2, // Tuesday
      hour: 10,   // 10 AM
      created_at: new Date().toISOString()
    },
    {
      name: 'Auto Repair Partnership Drive',
      industry: 'Auto Repair',
      status: 'ACTIVE', 
      is_active: true,
      max_sends: 5,
      weekday: 3, // Wednesday
      hour: 14,   // 2 PM
      created_at: new Date().toISOString()
    }
  ]
}

// Seeding functions
async function createUsers() {
  console.log('👥 Seeding users...')
  
  const users = [SAMPLE_DATA.admin_user, SAMPLE_DATA.test_user]
  
  for (const userData of users) {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'email' })
    
    if (error) {
      console.error(`Error creating user ${userData.email}:`, error.message)
    } else {
      console.log(`✅ Created user: ${userData.email}`)
    }
  }
}

async function createSearches() {
  console.log('🔍 Seeding searches...')
  
  // Get test user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', SAMPLE_DATA.test_user.email)
    .single()
  
  if (!user) {
    console.error('Test user not found, skipping search creation')
    return
  }
  
  const searches = []
  SAMPLE_DATA.industries.forEach(industry => {
    SAMPLE_DATA.cities.forEach(location => {
      searches.push({
        user_id: user.id,
        industry,
        city: location.city,
        state: location.state,
        total_results: Math.floor(Math.random() * 50) + 10,
        companies_saved: Math.floor(Math.random() * 20) + 5,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    })
  })
  
  // Insert random subset of searches
  const randomSearches = searches.sort(() => 0.5 - Math.random()).slice(0, 8)
  
  const { data, error } = await supabase
    .from('searches')
    .insert(randomSearches)
  
  if (error) {
    console.error('Error creating searches:', error.message)
  } else {
    console.log(`✅ Created ${randomSearches.length} searches`)
  }
}

async function createCompanies() {
  console.log('🏢 Seeding companies...')
  
  // Get a search to associate companies with
  const { data: searches } = await supabase
    .from('searches')
    .select('id, user_id')
    .limit(3)
  
  if (!searches || searches.length === 0) {
    console.error('No searches found, skipping company creation')
    return
  }
  
  const companies = SAMPLE_DATA.companies.map((company, index) => ({
    ...company,
    search_id: searches[index % searches.length].id,
    user_id: searches[index % searches.length].user_id,
    created_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('companies')
    .insert(companies)
  
  if (error) {
    console.error('Error creating companies:', error.message)
  } else {
    console.log(`✅ Created ${companies.length} companies`)
  }
}

async function createEnrichments() {
  console.log('💰 Seeding enrichments...')
  
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
  
  if (!companies || companies.length === 0) {
    console.error('No companies found, skipping enrichment creation')
    return
  }
  
  const enrichments = companies.map((company, index) => ({
    company_id: company.id,
    owner_name: ['John Smith', 'Sarah Johnson', 'Mike Wilson'][index % 3],
    owner_email: [`owner${index}@example.com`],
    owner_phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    employee_count: [5, 12, 25, 50, 100][Math.floor(Math.random() * 5)],
    revenue: [250000, 500000, 1000000, 2500000][Math.floor(Math.random() * 4)],
    confidence: 0.7 + Math.random() * 0.3,
    status: 'COMPLETED',
    enriched_at: new Date().toISOString(),
    sources: {
      owner_email: 'hunter',
      employee_count: 'apollo',
      revenue: 'zoominfo'
    }
  }))
  
  const { data, error } = await supabase
    .from('enrichments')
    .insert(enrichments)
  
  if (error) {
    console.error('Error creating enrichments:', error.message)
  } else {
    console.log(`✅ Created ${enrichments.length} enrichments`)
  }
}

async function createEmailTemplates() {
  console.log('📧 Seeding email templates...')
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', SAMPLE_DATA.test_user.email)
    .single()
  
  if (!user) {
    console.error('Test user not found, skipping template creation')
    return
  }
  
  const templates = SAMPLE_DATA.email_templates.map(template => ({
    ...template,
    user_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert(templates)
  
  if (error) {
    console.error('Error creating email templates:', error.message)
  } else {
    console.log(`✅ Created ${templates.length} email templates`)
  }
}

async function createCampaigns() {
  console.log('📊 Seeding campaigns...')
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', SAMPLE_DATA.test_user.email)
    .single()
  
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id')
    .limit(2)
  
  if (!user || !templates || templates.length === 0) {
    console.error('User or templates not found, skipping campaign creation')
    return
  }
  
  const campaigns = SAMPLE_DATA.campaigns.map((campaign, index) => ({
    ...campaign,
    user_id: user.id,
    email_template_id: templates[index % templates.length].id
  }))
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaigns)
  
  if (error) {
    console.error('Error creating campaigns:', error.message)
  } else {
    console.log(`✅ Created ${campaigns.length} campaigns`)
  }
}

async function createAuditLogs() {
  console.log('📝 Seeding audit logs...')
  
  const { data: users } = await supabase
    .from('users')
    .select('id')
  
  if (!users || users.length === 0) {
    console.error('No users found, skipping audit log creation')
    return
  }
  
  const auditLogs = []
  const actions = ['USER_LOGIN', 'SEARCH_PERFORMED', 'COMPANIES_SAVED', 'REPORT_GENERATED', 'EMAIL_SENT']
  
  for (let i = 0; i < 20; i++) {
    auditLogs.push({
      user_id: users[Math.floor(Math.random() * users.length)].id,
      action: actions[Math.floor(Math.random() * actions.length)],
      entity: 'SYSTEM',
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Chrome/91.0.4472.124'
      }
    })
  }
  
  const { data, error } = await supabase
    .from('audit_logs')
    .insert(auditLogs)
  
  if (error) {
    console.error('Error creating audit logs:', error.message)
  } else {
    console.log(`✅ Created ${auditLogs.length} audit logs`)
  }
}

// Main seeding function
async function main() {
  console.log('🌱 Starting database seeding...')
  console.log('=' .repeat(50))
  
  try {
    await createUsers()
    await createSearches()
    await createCompanies()
    await createEnrichments()
    await createEmailTemplates()
    await createCampaigns()
    await createAuditLogs()
    
    console.log('=' .repeat(50))
    console.log('✅ Database seeding completed successfully!')
    console.log('')
    console.log('Test accounts created:')
    console.log('📧 Admin: admin@exitschool.com')
    console.log('📧 User: test@example.com')
    console.log('')
    console.log('You can now:')
    console.log('1. Test the admin approval flow')
    console.log('2. Explore the seeded data')
    console.log('3. Test email campaigns')
    console.log('4. Generate sample reports')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Run the seeding
main()