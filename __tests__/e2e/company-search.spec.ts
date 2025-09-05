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
}

class CompanySearchPage {
  constructor(private page: Page) {}

  async performSearch(industry: string, city: string, state: string) {
    await this.page.goto('/dashboard/search')
    
    await this.page.fill('input[name="industry"]', industry)
    await this.page.fill('input[name="city"]', city)
    await this.page.selectOption('select[name="state"]', state)
    
    // Mock the Google Places API response
    await this.page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                name: 'Test Restaurant 1',
                formatted_address: '123 Main St, Seattle, WA 98101',
                rating: 4.5,
                user_ratings_total: 150,
                place_id: 'ChIJTest1',
                business_status: 'OPERATIONAL',
                types: ['restaurant', 'food', 'establishment']
              },
              {
                name: 'Test Restaurant 2', 
                formatted_address: '456 Pine St, Seattle, WA 98102',
                rating: 4.2,
                user_ratings_total: 89,
                place_id: 'ChIJTest2',
                business_status: 'OPERATIONAL',
                types: ['restaurant', 'food', 'establishment']
              }
            ],
            total_results: 25
          }
        })
      })
    })

    await this.page.click('button[type="submit"]')
    
    // Wait for search results to load
    await expect(this.page.locator('[data-testid="search-results"]')).toBeVisible()
    await expect(this.page.locator('text=Test Restaurant 1')).toBeVisible()
  }

  async saveCompany(companyName: string) {
    const companyCard = this.page.locator(`[data-testid="company-card"]:has-text("${companyName}")`)
    await companyCard.locator('button:has-text("Save")').click()
    
    await expect(this.page.locator('text=Company saved')).toBeVisible()
    await expect(companyCard.locator('text=Saved')).toBeVisible()
  }

  async viewCompanyDetails(companyName: string) {
    const companyCard = this.page.locator(`[data-testid="company-card"]:has-text("${companyName}")`)
    await companyCard.click()
    
    await expect(this.page.locator('[data-testid="company-modal"]')).toBeVisible()
    await expect(this.page.locator(`text=${companyName}`)).toBeVisible()
  }

  async enrichCompany(companyName: string) {
    await this.viewCompanyDetails(companyName)
    
    // Mock enrichment API calls
    await this.page.route('**/api/companies/*/enrich', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            owner_name: 'John Smith',
            owner_email: 'john@testrestaurant.com',
            owner_phone: '(555) 123-4567',
            employee_count: 15,
            revenue: 750000,
            confidence: 0.85
          }
        })
      })
    })

    await this.page.click('button:has-text("Enrich Data")')
    
    await expect(this.page.locator('text=Enriching company data')).toBeVisible()
    await expect(this.page.locator('text=john@testrestaurant.com')).toBeVisible()
    await expect(this.page.locator('text=John Smith')).toBeVisible()
  }

  async exportResults() {
    await this.page.click('button:has-text("Export Results")')
    
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click('button:has-text("Download CSV")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('company-search')
    expect(download.suggestedFilename()).toContain('.csv')
    
    return download
  }
}

class SavedCompaniesPage {
  constructor(private page: Page) {}

  async viewSavedCompanies() {
    await this.page.goto('/dashboard/companies')
    await expect(this.page.locator('[data-testid="saved-companies"]')).toBeVisible()
  }

  async filterCompanies(industry: string) {
    await this.page.selectOption('select[name="industry-filter"]', industry)
    await expect(this.page.locator('[data-testid="companies-loading"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="companies-loading"]')).not.toBeVisible()
  }

  async removeCompany(companyName: string) {
    const companyRow = this.page.locator(`[data-testid="company-row"]:has-text("${companyName}")`)
    await companyRow.locator('button[aria-label="Remove company"]').click()
    
    // Confirm deletion
    await this.page.locator('button:has-text("Confirm")').click()
    
    await expect(this.page.locator('text=Company removed')).toBeVisible()
    await expect(companyRow).not.toBeVisible()
  }
}

test.describe('Company Search and Management', () => {
  let testUser: TestUser
  let companySearchPage: CompanySearchPage
  let savedCompaniesPage: SavedCompaniesPage

  test.beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase
      .from('users')
      .upsert({
        email: 'search-test@example.com',
        name: 'Search Test User',
        role: 'USER',
        status: 'ACTIVE',
        company_name: 'Test Search Company'
      }, { onConflict: 'email' })
      .select()
      .single()

    testUser = user
  })

  test.beforeEach(async ({ page }) => {
    companySearchPage = new CompanySearchPage(page)
    savedCompaniesPage = new SavedCompaniesPage(page)

    // Login as test user (simplified for testing)
    await page.goto('/login')
    await page.evaluate(() => {
      // Mock authentication state
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: { id: 'test-user-id', email: 'search-test@example.com' }
      }))
    })
  })

  test.afterAll(async () => {
    // Cleanup test data
    await supabase.from('companies').delete().eq('user_id', testUser.id)
    await supabase.from('searches').delete().eq('user_id', testUser.id)
    await supabase.from('users').delete().eq('id', testUser.id)
  })

  test('complete company search workflow', async ({ page }) => {
    // Step 1: Perform search
    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    
    // Verify search results display
    await expect(page.locator('text=Found 25 results')).toBeVisible()
    await expect(page.locator('[data-testid="company-card"]')).toHaveCount(2)
    
    // Step 2: Save companies
    await companySearchPage.saveCompany('Test Restaurant 1')
    await companySearchPage.saveCompany('Test Restaurant 2')
    
    // Step 3: View saved companies
    await savedCompaniesPage.viewSavedCompanies()
    await expect(page.locator('text=Test Restaurant 1')).toBeVisible()
    await expect(page.locator('text=Test Restaurant 2')).toBeVisible()
    
    // Step 4: Enrich company data
    await page.goto('/dashboard/search')
    await companySearchPage.enrichCompany('Test Restaurant 1')
    
    // Step 5: Export results
    const download = await companySearchPage.exportResults()
    await download.saveAs(`./test-results/company-search-${Date.now()}.csv`)
  })

  test('handles search with no results', async ({ page }) => {
    // Mock empty results
    await page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [],
            total_results: 0
          }
        })
      })
    })

    await companySearchPage.performSearch('Unicorn Farms', 'Nowhere', 'ZZ')
    
    await expect(page.locator('text=No companies found')).toBeVisible()
    await expect(page.locator('text=Try adjusting your search criteria')).toBeVisible()
  })

  test('handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      })
    })

    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    
    await expect(page.locator('text=Search failed')).toBeVisible()
    await expect(page.locator('text=Please try again')).toBeVisible()
    await expect(page.locator('button:has-text("Retry Search")')).toBeVisible()
  })

  test('validates search form inputs', async ({ page }) => {
    await page.goto('/dashboard/search')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Industry is required')).toBeVisible()
    await expect(page.locator('text=City is required')).toBeVisible()
    await expect(page.locator('text=State is required')).toBeVisible()
    
    // Fill partial form
    await page.fill('input[name="industry"]', 'Restaurants')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=City is required')).toBeVisible()
    await expect(page.locator('text=State is required')).toBeVisible()
  })

  test('supports pagination for large result sets', async ({ page }) => {
    // Mock large result set
    await page.route('**/api/search/companies', (route) => {
      const url = new URL(route.request().url())
      const page_param = url.searchParams.get('page') || '1'
      const pageNum = parseInt(page_param)
      
      const results = Array.from({ length: 10 }, (_, i) => ({
        name: `Restaurant ${(pageNum - 1) * 10 + i + 1}`,
        formatted_address: `${i + 1} Main St, Seattle, WA`,
        rating: 4.0 + Math.random(),
        user_ratings_total: Math.floor(Math.random() * 200),
        place_id: `ChIJTest${pageNum}-${i}`,
        business_status: 'OPERATIONAL',
        types: ['restaurant', 'food', 'establishment']
      }))

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results,
            total_results: 95,
            current_page: pageNum,
            total_pages: 10
          }
        })
      })
    })

    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    
    // Verify pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
    await expect(page.locator('text=Page 1 of 10')).toBeVisible()
    await expect(page.locator('button:has-text("Next")')).toBeVisible()
    
    // Navigate to next page
    await page.click('button:has-text("Next")')
    await expect(page.locator('text=Page 2 of 10')).toBeVisible()
    await expect(page.locator('text=Restaurant 11')).toBeVisible()
  })

  test('supports bulk operations on search results', async ({ page }) => {
    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    
    // Select multiple companies
    await page.locator('[data-testid="company-card"]:first-child input[type="checkbox"]').check()
    await page.locator('[data-testid="company-card"]:nth-child(2) input[type="checkbox"]').check()
    
    await expect(page.locator('text=2 companies selected')).toBeVisible()
    
    // Bulk save
    await page.click('button:has-text("Save Selected")')
    await expect(page.locator('text=2 companies saved')).toBeVisible()
    
    // Bulk enrich
    await page.click('button:has-text("Enrich Selected")')
    await expect(page.locator('text=Enriching 2 companies')).toBeVisible()
  })

  test('filters and sorts saved companies', async ({ page }) => {
    // Setup test data
    await supabase.from('companies').insert([
      {
        user_id: testUser.id,
        name: 'Pizza Place',
        address: '123 Main St, Seattle, WA',
        rating: 4.5,
        review_count: 100,
        place_id: 'test1',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        user_id: testUser.id,
        name: 'Burger Joint',
        address: '456 Pine St, Seattle, WA',
        rating: 4.0,
        review_count: 50,
        place_id: 'test2',
        created_at: new Date().toISOString() // Now
      }
    ])

    await savedCompaniesPage.viewSavedCompanies()
    
    // Test sorting by rating
    await page.selectOption('select[name="sort"]', 'rating')
    
    const companyNames = await page.locator('[data-testid="company-row"] .company-name').allTextContents()
    expect(companyNames[0]).toBe('Pizza Place') // Higher rating first
    
    // Test sorting by date added
    await page.selectOption('select[name="sort"]', 'created_at')
    
    const companyNamesById = await page.locator('[data-testid="company-row"] .company-name').allTextContents()
    expect(companyNamesById[0]).toBe('Burger Joint') // More recent first
    
    // Test search filter
    await page.fill('input[name="search"]', 'Pizza')
    await page.waitForTimeout(500) // Debounce delay
    
    await expect(page.locator('text=Pizza Place')).toBeVisible()
    await expect(page.locator('text=Burger Joint')).not.toBeVisible()
  })

  test('company enrichment with multiple sources', async ({ page }) => {
    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    
    // Mock multiple enrichment sources
    let enrichmentStep = 0
    await page.route('**/api/companies/*/enrich', (route) => {
      enrichmentStep++
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            owner_email: enrichmentStep >= 1 ? 'owner@restaurant.com' : null,
            owner_phone: enrichmentStep >= 2 ? '(555) 123-4567' : null,
            employee_count: enrichmentStep >= 3 ? 15 : null,
            revenue: enrichmentStep >= 4 ? 750000 : null,
            confidence: 0.65 + (enrichmentStep * 0.05),
            sources: {
              email: enrichmentStep >= 1 ? 'hunter.io' : null,
              phone: enrichmentStep >= 2 ? 'apollo.io' : null,
              employee_count: enrichmentStep >= 3 ? 'linkedin' : null,
              revenue: enrichmentStep >= 4 ? 'zoominfo' : null
            },
            step: enrichmentStep,
            total_steps: 4
          }
        })
      })
    })

    await companySearchPage.viewCompanyDetails('Test Restaurant 1')
    await page.click('button:has-text("Enrich Data")')
    
    // Watch enrichment progress
    await expect(page.locator('text=Step 1 of 4')).toBeVisible()
    await expect(page.locator('text=Finding email address')).toBeVisible()
    
    // Wait for completion
    await expect(page.locator('text=Enrichment complete')).toBeVisible()
    await expect(page.locator('text=owner@restaurant.com')).toBeVisible()
    await expect(page.locator('text=(555) 123-4567')).toBeVisible()
    await expect(page.locator('text=15 employees')).toBeVisible()
    await expect(page.locator('text=$750,000 revenue')).toBeVisible()
  })
})

// Performance testing for search operations
test.describe('Company Search Performance', () => {
  test('search completes within performance budget', async ({ page }) => {
    const companySearchPage = new CompanySearchPage(page)
    
    const startTime = Date.now()
    await companySearchPage.performSearch('Restaurants', 'Seattle', 'WA')
    const endTime = Date.now()
    
    const searchTime = endTime - startTime
    expect(searchTime).toBeLessThan(5000) // Should complete within 5 seconds
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation')[0])
    })
    
    const metrics = JSON.parse(performanceMetrics)
    expect(metrics.loadEventEnd - metrics.loadEventStart).toBeLessThan(3000)
  })
})