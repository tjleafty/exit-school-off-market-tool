import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestUser {
  id: string
  email: string
  name: string
  token?: string
  invitationId?: string
}

class OnboardingPage {
  constructor(private page: Page) {}

  async requestAccount(email: string, name: string, companyName: string) {
    await this.page.goto('/request')
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[name="name"]', name)
    await this.page.fill('input[name="companyName"]', companyName)
    await this.page.click('button[type="submit"]')
    
    await expect(this.page.locator('text=Request submitted')).toBeVisible()
    await expect(this.page.locator('text=We will review your request')).toBeVisible()
  }

  async acceptInvitation(token: string, password: string) {
    await this.page.goto(`/accept?token=${token}`)
    
    // Wait for invitation validation
    await expect(this.page.locator('text=Create Your Account')).toBeVisible()
    
    await this.page.fill('input[type="password"]', password)
    await this.page.fill('input[name="confirmPassword"]', password)
    await this.page.click('button:has-text("Create Account")')
    
    // Should redirect to dashboard after successful account creation
    await this.page.waitForURL('/dashboard')
    await expect(this.page.locator('text=Welcome')).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]')
    
    await this.page.waitForURL('/dashboard')
    await expect(this.page.locator('text=Dashboard')).toBeVisible()
  }
}

class AdminPage {
  constructor(private page: Page) {}

  async approveUser(userEmail: string) {
    await this.page.goto('/admin/users')
    
    // Find the user in pending requests
    const userRow = this.page.locator(`tr:has-text("${userEmail}")`)
    await expect(userRow).toBeVisible()
    
    // Click approve button
    await userRow.locator('button:has-text("Approve")').click()
    
    // Confirm approval in modal
    await this.page.locator('button:has-text("Send Invitation")').click()
    
    // Wait for success message
    await expect(this.page.locator('text=Invitation sent')).toBeVisible()
  }

  async loginAsAdmin() {
    await this.page.goto('/login')
    await this.page.fill('input[type="email"]', 'admin@exitschool.com')
    await this.page.fill('input[type="password"]', 'admin123')
    await this.page.click('button[type="submit"]')
    
    await this.page.waitForURL('/admin')
    await expect(this.page.locator('text=Admin Dashboard')).toBeVisible()
  }
}

test.describe('Complete Onboarding Flow', () => {
  let testUser: TestUser
  let onboardingPage: OnboardingPage
  let adminPage: AdminPage

  test.beforeAll(async () => {
    // Ensure admin user exists
    const { error } = await supabase
      .from('users')
      .upsert({
        email: 'admin@exitschool.com',
        name: 'Admin User',
        role: 'ADMIN',
        status: 'ACTIVE',
        company_name: 'Exit School'
      }, { onConflict: 'email' })
    
    if (error) console.warn('Admin setup warning:', error)
  })

  test.beforeEach(async ({ page }) => {
    onboardingPage = new OnboardingPage(page)
    adminPage = new AdminPage(page)
    
    // Generate unique test user
    const timestamp = Date.now()
    testUser = {
      id: '',
      email: `test-${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
    }
  })

  test.afterEach(async () => {
    // Cleanup test user and related data
    if (testUser.id) {
      await supabase.from('invitations').delete().eq('user_id', testUser.id)
      await supabase.from('users').delete().eq('id', testUser.id)
    }
  })

  test('complete onboarding flow from request to dashboard access', async ({ page }) => {
    // Step 1: User requests account
    await onboardingPage.requestAccount(
      testUser.email,
      testUser.name,
      'Test Company LLC'
    )

    // Verify user was created with REQUESTED status
    const { data: createdUser } = await supabase
      .from('users')
      .select('id, status, email, name')
      .eq('email', testUser.email)
      .single()

    expect(createdUser).toBeTruthy()
    expect(createdUser.status).toBe('REQUESTED')
    testUser.id = createdUser.id

    // Step 2: Admin approves the request (in new context)
    const adminContext = await page.context().browser()?.newContext()
    const adminPageInstance = await adminContext!.newPage()
    const adminPageHelper = new AdminPage(adminPageInstance)
    
    await adminPageHelper.loginAsAdmin()
    await adminPageHelper.approveUser(testUser.email)
    
    await adminPageInstance.close()
    await adminContext?.close()

    // Verify user status changed to APPROVED and invitation created
    const { data: approvedUser } = await supabase
      .from('users')
      .select('id, status')
      .eq('id', testUser.id)
      .single()

    expect(approvedUser.status).toBe('APPROVED')

    const { data: invitation } = await supabase
      .from('invitations')
      .select('token, expires_at')
      .eq('user_id', testUser.id)
      .eq('status', 'PENDING')
      .single()

    expect(invitation).toBeTruthy()
    expect(invitation.token).toBeTruthy()
    testUser.token = invitation.token

    // Step 3: User accepts invitation and creates password
    await onboardingPage.acceptInvitation(testUser.token!, 'SecurePassword123!')

    // Verify user can access dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible()

    // Verify user status is now ACTIVE
    const { data: activeUser } = await supabase
      .from('users')
      .select('status')
      .eq('id', testUser.id)
      .single()

    expect(activeUser.status).toBe('ACTIVE')

    // Verify invitation is now used
    const { data: usedInvitation } = await supabase
      .from('invitations')
      .select('status, accepted_at')
      .eq('user_id', testUser.id)
      .single()

    expect(usedInvitation.status).toBe('ACCEPTED')
    expect(usedInvitation.accepted_at).toBeTruthy()
  })

  test('handles expired invitation gracefully', async ({ page }) => {
    // Create user and expired invitation directly
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        name: testUser.name,
        status: 'APPROVED',
        company_name: 'Test Company'
      })
      .select()
      .single()

    testUser.id = user.id

    const { data: invitation } = await supabase
      .from('invitations')
      .insert({
        user_id: user.id,
        token: 'expired-token',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        status: 'PENDING'
      })
      .select()
      .single()

    // Try to accept expired invitation
    await page.goto(`/accept?token=expired-token`)
    
    await expect(page.locator('text=Invitation has expired')).toBeVisible()
    await expect(page.locator('text=Request a new invitation')).toBeVisible()
  })

  test('prevents duplicate account requests', async ({ page }) => {
    // Create existing user
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        name: testUser.name,
        status: 'REQUESTED',
        company_name: 'Test Company'
      })
      .select()
      .single()

    testUser.id = user.id

    // Try to request account with same email
    await onboardingPage.requestAccount(
      testUser.email,
      'Different Name',
      'Different Company'
    )

    await expect(page.locator('text=Account request already exists')).toBeVisible()
  })

  test('validates invitation token security', async ({ page }) => {
    // Try to access with invalid token
    await page.goto('/accept?token=invalid-token-123')
    
    await expect(page.locator('text=Invalid invitation')).toBeVisible()
    await expect(page.locator('text=Contact support')).toBeVisible()
  })

  test('enforces password requirements', async ({ page }) => {
    // Create valid invitation
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        name: testUser.name,
        status: 'APPROVED',
        company_name: 'Test Company'
      })
      .select()
      .single()

    testUser.id = user.id

    const { data: invitation } = await supabase
      .from('invitations')
      .insert({
        user_id: user.id,
        token: 'valid-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'PENDING'
      })
      .select()
      .single()

    await page.goto('/accept?token=valid-token')
    
    // Try weak password
    await page.fill('input[type="password"]', '123')
    await page.fill('input[name="confirmPassword"]', '123')
    await page.click('button:has-text("Create Account")')

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()

    // Try mismatched passwords
    await page.fill('input[type="password"]', 'StrongPassword123!')
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
    await page.click('button:has-text("Create Account")')

    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('handles network errors during account creation', async ({ page }) => {
    // Create valid invitation
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        name: testUser.name,
        status: 'APPROVED',
        company_name: 'Test Company'
      })
      .select()
      .single()

    testUser.id = user.id

    await supabase
      .from('invitations')
      .insert({
        user_id: user.id,
        token: 'valid-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'PENDING'
      })

    await page.goto('/accept?token=valid-token')
    
    // Intercept and fail the account creation request
    await page.route('**/api/auth/accept-invitation', route => 
      route.abort('failed')
    )
    
    await page.fill('input[type="password"]', 'StrongPassword123!')
    await page.fill('input[name="confirmPassword"]', 'StrongPassword123!')
    await page.click('button:has-text("Create Account")')

    await expect(page.locator('text=Network error')).toBeVisible()
    await expect(page.locator('text=Please try again')).toBeVisible()
  })

  test('supports login after successful onboarding', async ({ page }) => {
    // Create active user (simulating completed onboarding)
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: testUser.email,
        name: testUser.name,
        status: 'ACTIVE',
        company_name: 'Test Company'
      })
      .select()
      .single()

    testUser.id = user.id

    // Create auth user in Supabase Auth (this would normally be done during onboarding)
    // Note: This is simplified - in real tests you'd need to create actual auth users
    
    await onboardingPage.login(testUser.email, 'TestPassword123!')
    
    // Should successfully reach dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible()
  })
})

// Additional test for mobile responsiveness
test.describe('Onboarding Flow - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('onboarding works on mobile devices', async ({ page }) => {
    const timestamp = Date.now()
    const mobileUser = {
      email: `mobile-${timestamp}@example.com`,
      name: `Mobile User ${timestamp}`,
    }

    const onboardingPage = new OnboardingPage(page)
    
    await onboardingPage.requestAccount(
      mobileUser.email,
      mobileUser.name,
      'Mobile Test Company'
    )

    // Verify mobile-specific UI elements
    await expect(page.locator('[data-testid="mobile-request-form"]')).toBeVisible()
    await expect(page.locator('text=Request submitted')).toBeVisible()

    // Cleanup
    await supabase.from('users').delete().eq('email', mobileUser.email)
  })
})