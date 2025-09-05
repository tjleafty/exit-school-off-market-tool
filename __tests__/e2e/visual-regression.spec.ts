import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Visual regression testing configuration
const visualConfig = {
  threshold: 0.2, // 20% difference threshold
  animations: 'disabled' as const,
  mask: [
    // Mask dynamic content that changes between runs
    { selector: '[data-testid="current-time"]' },
    { selector: '[data-testid="dynamic-stats"]' },
    { selector: '.loading-spinner' },
  ]
}

class VisualTestHelper {
  static async setupTestData() {
    // Create consistent test data for visual tests
    const testUserId = 'visual-test-user-id'
    
    // Create test user
    await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'visual@test.com',
        name: 'Visual Test User',
        role: 'USER',
        status: 'ACTIVE',
        company_name: 'Visual Test Company'
      }, { onConflict: 'id' })

    // Create test companies for consistent display
    await supabase
      .from('companies')
      .upsert([
        {
          id: 'visual-company-1',
          user_id: testUserId,
          name: 'Visual Test Restaurant',
          address: '123 Visual St, Test City, TS 12345',
          rating: 4.5,
          review_count: 150,
          place_id: 'visual_test_1',
          created_at: new Date('2024-01-01T12:00:00Z').toISOString()
        },
        {
          id: 'visual-company-2',
          user_id: testUserId,
          name: 'Visual Test Cafe',
          address: '456 Display Ave, Test City, TS 12345',
          rating: 4.2,
          review_count: 89,
          place_id: 'visual_test_2',
          created_at: new Date('2024-01-01T12:00:00Z').toISOString()
        }
      ], { onConflict: 'id' })

    // Create test email template
    await supabase
      .from('email_templates')
      .upsert({
        id: 'visual-template-1',
        user_id: testUserId,
        name: 'Visual Test Template',
        type: 'CAMPAIGN',
        subject: 'Partnership Opportunity with {{sender_company}}',
        content: 'Hello {{recipient_name}}, this is a test email for visual regression testing.',
        variables: ['recipient_name', 'sender_company'],
        is_active: true
      }, { onConflict: 'id' })

    return testUserId
  }

  static async cleanupTestData() {
    const testUserId = 'visual-test-user-id'
    
    // Clean up in dependency order
    await supabase.from('email_templates').delete().eq('user_id', testUserId)
    await supabase.from('companies').delete().eq('user_id', testUserId)
    await supabase.from('searches').delete().eq('user_id', testUserId)
    await supabase.from('users').delete().eq('id', testUserId)
  }

  static async mockAuthState(page: any, userId: string) {
    // Mock authentication state for consistent testing
    await page.addInitScript((userId) => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: userId,
          email: 'visual@test.com',
          role: 'USER'
        }
      }))
    }, userId)
  }
}

test.describe('Visual Regression Tests', () => {
  let testUserId: string

  test.beforeAll(async () => {
    testUserId = await VisualTestHelper.setupTestData()
  })

  test.afterAll(async () => {
    await VisualTestHelper.cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    // Configure page for consistent visuals
    await page.setViewportSize({ width: 1280, height: 720 })
    await VisualTestHelper.mockAuthState(page, testUserId)
  })

  test('homepage layout consistency', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Hide dynamic elements
    await page.addStyleTag({
      content: `
        [data-testid="current-time"] { visibility: hidden; }
        .loading-spinner { display: none; }
        .animate-pulse { animation: none !important; }
      `
    })

    await expect(page).toHaveScreenshot('homepage-desktop.png', visualConfig)
  })

  test('login page visual consistency', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Test different states
    await expect(page).toHaveScreenshot('login-page-default.png', visualConfig)

    // Fill form to show filled state
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    
    await expect(page).toHaveScreenshot('login-page-filled.png', visualConfig)

    // Show validation error state
    await page.fill('input[type="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    await page.waitForSelector('text=Please enter a valid email')
    
    await expect(page).toHaveScreenshot('login-page-error.png', visualConfig)
  })

  test('dashboard layout consistency', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait for components to render
    await page.waitForSelector('[data-testid="dashboard-stats"]')
    
    await expect(page).toHaveScreenshot('dashboard-desktop.png', visualConfig)
  })

  test('company search page visual consistency', async ({ page }) => {
    // Mock search API to return consistent results
    await page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                name: 'Visual Test Restaurant',
                formatted_address: '123 Visual St, Test City, TS 12345',
                rating: 4.5,
                user_ratings_total: 150,
                place_id: 'visual_test_1',
                business_status: 'OPERATIONAL',
                types: ['restaurant', 'food', 'establishment']
              },
              {
                name: 'Visual Test Cafe',
                formatted_address: '456 Display Ave, Test City, TS 12345',
                rating: 4.2,
                user_ratings_total: 89,
                place_id: 'visual_test_2',
                business_status: 'OPERATIONAL',
                types: ['restaurant', 'food', 'establishment']
              }
            ],
            total_results: 2
          }
        })
      })
    })

    await page.goto('/dashboard/search')
    await page.waitForLoadState('networkidle')

    // Empty search form
    await expect(page).toHaveScreenshot('search-page-empty.png', visualConfig)

    // Filled search form
    await page.fill('input[name="industry"]', 'Restaurants')
    await page.fill('input[name="city"]', 'Test City')
    await page.selectOption('select[name="state"]', 'TS')
    
    await expect(page).toHaveScreenshot('search-page-filled.png', visualConfig)

    // Search results
    await page.click('button[type="submit"]')
    await page.waitForSelector('[data-testid="search-results"]')
    
    await expect(page).toHaveScreenshot('search-page-results.png', visualConfig)
  })

  test('saved companies page visual consistency', async ({ page }) => {
    await page.goto('/dashboard/companies')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="saved-companies"]')

    await expect(page).toHaveScreenshot('saved-companies-desktop.png', visualConfig)

    // Test with filters applied
    await page.selectOption('select[name="sort"]', 'rating')
    await page.waitForTimeout(500) // Wait for sort to apply

    await expect(page).toHaveScreenshot('saved-companies-sorted.png', visualConfig)
  })

  test('email templates page visual consistency', async ({ page }) => {
    await page.goto('/dashboard/email/templates')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('email-templates-list.png', visualConfig)

    // Open template editor
    await page.click('button:has-text("Edit"):first')
    await page.waitForSelector('[data-testid="template-editor"]')

    await expect(page).toHaveScreenshot('email-template-editor.png', visualConfig)
  })

  test('admin dashboard visual consistency', async ({ page }) => {
    // Mock admin user
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-admin-token',
        user: {
          id: 'admin-id',
          email: 'admin@exitschool.com',
          role: 'ADMIN'
        }
      }))
    })

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('admin-dashboard.png', visualConfig)

    // Navigate to user management
    await page.click('text=User Management')
    await page.waitForSelector('[data-testid="user-management"]')

    await expect(page).toHaveScreenshot('admin-user-management.png', visualConfig)
  })
})

// Mobile visual regression tests
test.describe('Visual Regression Tests - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  let testUserId: string

  test.beforeAll(async () => {
    testUserId = await VisualTestHelper.setupTestData()
  })

  test.afterAll(async () => {
    await VisualTestHelper.cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    await VisualTestHelper.mockAuthState(page, testUserId)
  })

  test('homepage mobile layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.addStyleTag({
      content: `
        [data-testid="current-time"] { visibility: hidden; }
        .loading-spinner { display: none; }
        .animate-pulse { animation: none !important; }
      `
    })

    await expect(page).toHaveScreenshot('homepage-mobile.png', visualConfig)
  })

  test('dashboard mobile layout', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="dashboard-stats"]')

    await expect(page).toHaveScreenshot('dashboard-mobile.png', visualConfig)
  })

  test('search page mobile layout', async ({ page }) => {
    await page.goto('/dashboard/search')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('search-page-mobile.png', visualConfig)
  })

  test('mobile navigation menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]')
    await page.waitForSelector('[data-testid="mobile-menu"]')

    await expect(page).toHaveScreenshot('mobile-navigation-open.png', visualConfig)
  })
})

// Dark mode visual regression tests
test.describe('Visual Regression Tests - Dark Mode', () => {
  let testUserId: string

  test.beforeAll(async () => {
    testUserId = await VisualTestHelper.setupTestData()
  })

  test.afterAll(async () => {
    await VisualTestHelper.cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    await VisualTestHelper.mockAuthState(page, testUserId)
    
    // Enable dark mode
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('homepage dark mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await page.addStyleTag({
      content: `
        [data-testid="current-time"] { visibility: hidden; }
        .loading-spinner { display: none; }
        .animate-pulse { animation: none !important; }
      `
    })

    await expect(page).toHaveScreenshot('homepage-dark.png', visualConfig)
  })

  test('dashboard dark mode', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="dashboard-stats"]')

    await expect(page).toHaveScreenshot('dashboard-dark.png', visualConfig)
  })

  test('search results dark mode', async ({ page }) => {
    await page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                name: 'Dark Mode Test Restaurant',
                formatted_address: '123 Dark St, Night City, DM 12345',
                rating: 4.5,
                user_ratings_total: 150,
                place_id: 'dark_test_1',
                business_status: 'OPERATIONAL',
                types: ['restaurant', 'food', 'establishment']
              }
            ],
            total_results: 1
          }
        })
      })
    })

    await page.goto('/dashboard/search')
    await page.fill('input[name="industry"]', 'Restaurants')
    await page.fill('input[name="city"]', 'Night City')
    await page.selectOption('select[name="state"]', 'DM')
    await page.click('button[type="submit"]')
    
    await page.waitForSelector('[data-testid="search-results"]')
    
    await expect(page).toHaveScreenshot('search-results-dark.png', visualConfig)
  })
})

// Component-specific visual regression tests
test.describe('Component Visual Regression', () => {
  let testUserId: string

  test.beforeAll(async () => {
    testUserId = await VisualTestHelper.setupTestData()
  })

  test.afterAll(async () => {
    await VisualTestHelper.cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    await VisualTestHelper.mockAuthState(page, testUserId)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('company card variations', async ({ page }) => {
    await page.goto('/dashboard/companies')
    await page.waitForLoadState('networkidle')

    // Screenshot individual company cards
    const companyCards = page.locator('[data-testid="company-card"]')
    const cardCount = await companyCards.count()

    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      await expect(companyCards.nth(i)).toHaveScreenshot(`company-card-${i}.png`, visualConfig)
    }
  })

  test('form validation states', async ({ page }) => {
    await page.goto('/dashboard/search')
    
    // Valid state
    await page.fill('input[name="industry"]', 'Restaurants')
    await expect(page.locator('input[name="industry"]')).toHaveScreenshot('input-valid.png', visualConfig)

    // Error state
    await page.fill('input[name="industry"]', '')
    await page.click('button[type="submit"]')
    await page.waitForSelector('.error-message')
    await expect(page.locator('.form-field:has(.error-message)')).toHaveScreenshot('input-error.png', visualConfig)
  })

  test('modal dialogs', async ({ page }) => {
    await page.goto('/dashboard/companies')
    await page.waitForLoadState('networkidle')

    // Open company details modal
    await page.click('[data-testid="company-card"]:first-child')
    await page.waitForSelector('[data-testid="company-modal"]')

    await expect(page.locator('[data-testid="company-modal"]')).toHaveScreenshot('company-modal.png', visualConfig)

    // Close modal and open delete confirmation
    await page.click('[data-testid="close-modal"]')
    await page.click('[data-testid="delete-company-button"]:first')
    await page.waitForSelector('[data-testid="delete-confirmation-modal"]')

    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toHaveScreenshot('delete-confirmation-modal.png', visualConfig)
  })
})