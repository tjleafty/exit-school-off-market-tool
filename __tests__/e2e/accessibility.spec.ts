import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Accessibility testing configuration
const A11Y_CONFIG = {
  // WCAG 2.1 Level AA compliance
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  
  // Rules to disable (if any specific false positives)
  disableRules: [
    // 'color-contrast' // Only disable if you have custom color contrast validation
  ],
  
  // Include specific rules for comprehensive testing
  includeRules: [
    'aria-allowed-attr',
    'aria-hidden-body',
    'aria-required-children',
    'aria-required-parent',
    'aria-valid-attr',
    'aria-valid-attr-value',
    'button-name',
    'bypass',
    'color-contrast',
    'focus-order-semantics',
    'form-field-multiple-labels',
    'frame-title',
    'html-has-lang',
    'image-alt',
    'input-image-alt',
    'keyboard-navigation',
    'label',
    'link-name',
    'list',
    'listitem',
    'meta-refresh',
    'meta-viewport',
    'page-has-heading-one',
    'region',
    'skip-link',
    'tabindex',
    'td-headers-attr',
    'th-has-data-cells'
  ]
}

interface KeyboardNavigationTest {
  startSelector: string
  expectedStops: string[]
  description: string
}

class AccessibilityTester {
  constructor(private page: Page) {}

  async runAxeAnalysis(context?: string): Promise<any> {
    const axeBuilder = new AxeBuilder({ page: this.page })
      .withTags(A11Y_CONFIG.tags)
      .disableRules(A11Y_CONFIG.disableRules)
    
    if (context) {
      axeBuilder.include(context)
    }

    return await axeBuilder.analyze()
  }

  async testKeyboardNavigation(test: KeyboardNavigationTest): Promise<boolean> {
    console.log(`🎹 Testing keyboard navigation: ${test.description}`)
    
    // Start from the specified element
    await this.page.focus(test.startSelector)
    
    const focusedElements: string[] = []
    
    // Navigate through expected stops using Tab key
    for (let i = 0; i < test.expectedStops.length + 2; i++) {
      const focusedElement = await this.page.evaluate(() => {
        const element = document.activeElement
        if (!element) return null
        
        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          selector: element.getAttribute('data-testid') || 
                   (element.id ? `#${element.id}` : 
                   element.className ? `.${element.className.split(' ')[0]}` : 
                   element.tagName.toLowerCase())
        }
      })
      
      if (focusedElement) {
        focusedElements.push(focusedElement.selector)
      }
      
      await this.page.keyboard.press('Tab')
      await this.page.waitForTimeout(100) // Small delay for focus to settle
    }
    
    console.log(`   Focused elements: ${focusedElements.join(' → ')}`)
    
    // Check if all expected stops were hit
    const allExpectedFound = test.expectedStops.every(expected => 
      focusedElements.some(actual => actual.includes(expected))
    )
    
    return allExpectedFound
  }

  async testScreenReaderContent(): Promise<void> {
    // Test ARIA labels and descriptions
    const ariaElements = await this.page.locator('[aria-label], [aria-labelledby], [aria-describedby]').all()
    
    for (const element of ariaElements) {
      const ariaLabel = await element.getAttribute('aria-label')
      const ariaLabelledBy = await element.getAttribute('aria-labelledby')
      const ariaDescribedBy = await element.getAttribute('aria-describedby')
      
      if (ariaLabel) {
        expect(ariaLabel.trim().length).toBeGreaterThan(0)
      }
      
      if (ariaLabelledBy) {
        const labelElement = this.page.locator(`#${ariaLabelledBy}`)
        await expect(labelElement).toBeVisible()
      }
      
      if (ariaDescribedBy) {
        const descElement = this.page.locator(`#${ariaDescribedBy}`)
        await expect(descElement).toBeVisible()
      }
    }
  }

  async testColorContrast(): Promise<void> {
    // Test color contrast ratios programmatically
    const contrastIssues = await this.page.evaluate(() => {
      const issues: Array<{element: string, contrast: number, required: number}> = []
      
      // This would typically use a library like axe-core for accurate contrast calculation
      // For now, we'll do a basic check on common elements
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label')
      
      textElements.forEach((element, index) => {
        if (index < 10) { // Limit to first 10 elements for performance
          const styles = window.getComputedStyle(element)
          const color = styles.color
          const backgroundColor = styles.backgroundColor
          
          // Basic contrast check (this is simplified - real implementation would use proper contrast calculation)
          if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            // Mark as potential issue if colors are too similar (simplified check)
            const isLowContrast = color === backgroundColor || 
                                 (color.includes('rgb(') && backgroundColor.includes('rgb(') && 
                                  Math.abs(parseInt(color.split('(')[1]) - parseInt(backgroundColor.split('(')[1])) < 100)
            
            if (isLowContrast) {
              issues.push({
                element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
                contrast: 2.1, // Simplified - would calculate actual ratio
                required: 4.5
              })
            }
          }
        }
      })
      
      return issues
    })

    if (contrastIssues.length > 0) {
      console.warn(`⚠️  Potential color contrast issues found:`, contrastIssues)
    }
  }

  async generateA11yReport(results: any, pageName: string) {
    const violations = results.violations || []
    const passes = results.passes || []
    const incomplete = results.incomplete || []
    
    console.log(`\n♿ Accessibility Report - ${pageName}`)
    console.log('='.repeat(50))
    console.log(`✅ Passed: ${passes.length} rules`)
    console.log(`❌ Violations: ${violations.length} rules`)
    console.log(`⚠️  Incomplete: ${incomplete.length} rules`)
    
    if (violations.length > 0) {
      console.log('\n🚨 Violations:')
      violations.forEach((violation: any, index: number) => {
        console.log(`   ${index + 1}. ${violation.id}: ${violation.description}`)
        console.log(`      Impact: ${violation.impact}`)
        console.log(`      Nodes: ${violation.nodes.length}`)
        if (violation.nodes[0]) {
          console.log(`      Example: ${violation.nodes[0].html.substring(0, 100)}...`)
        }
      })
    }
    
    return {
      page: pageName,
      timestamp: new Date().toISOString(),
      passed: passes.length,
      violations: violations.length,
      incomplete: incomplete.length,
      issues: violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodeCount: v.nodes.length
      }))
    }
  }
}

test.describe('Accessibility Testing', () => {
  let accessibilityTester: AccessibilityTester
  let testUserId: string

  test.beforeAll(async () => {
    // Create test user and data for consistent accessibility testing
    const { data: user } = await supabase
      .from('users')
      .upsert({
        id: 'a11y-test-user-id',
        email: 'a11y@test.com',
        name: 'Accessibility Test User',
        role: 'USER',
        status: 'ACTIVE',
        company_name: 'Accessibility Test Company'
      }, { onConflict: 'id' })

    testUserId = 'a11y-test-user-id'

    // Create sample companies
    await supabase.from('companies').upsert([
      {
        id: 'a11y-company-1',
        user_id: testUserId,
        name: 'Accessible Restaurant',
        address: '123 A11y St, Test City, AC 12345',
        rating: 4.5,
        review_count: 150,
        place_id: 'a11y_test_1'
      }
    ], { onConflict: 'id' })
  })

  test.beforeEach(async ({ page }) => {
    accessibilityTester = new AccessibilityTester(page)
    
    // Mock authentication
    await page.addInitScript((userId) => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'a11y-test-token',
        user: { id: userId, email: 'a11y@test.com', role: 'USER' }
      }))
    }, testUserId)
  })

  test.afterAll(async () => {
    // Cleanup
    await supabase.from('companies').delete().eq('user_id', testUserId)
    await supabase.from('users').delete().eq('id', testUserId)
  })

  test('homepage accessibility compliance', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const results = await accessibilityTester.runAxeAnalysis()
    const report = await accessibilityTester.generateA11yReport(results, 'Homepage')
    
    // Should have no violations
    expect(results.violations).toHaveLength(0)
    
    // Test keyboard navigation
    const keyboardTest = await accessibilityTester.testKeyboardNavigation({
      startSelector: 'body',
      expectedStops: ['login-button', 'get-started-button', 'learn-more-link'],
      description: 'Homepage main navigation'
    })
    
    expect(keyboardTest).toBe(true)
  })

  test('login form accessibility', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const results = await accessibilityTester.runAxeAnalysis()
    await accessibilityTester.generateA11yReport(results, 'Login Form')
    
    expect(results.violations).toHaveLength(0)
    
    // Test form-specific accessibility
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-required', 'true')
    await expect(page.locator('input[type="password"]')).toHaveAttribute('aria-required', 'true')
    
    // Test keyboard navigation through form
    const formKeyboardTest = await accessibilityTester.testKeyboardNavigation({
      startSelector: 'input[type="email"]',
      expectedStops: ['email', 'password', 'submit', 'forgot-password'],
      description: 'Login form navigation'
    })
    
    expect(formKeyboardTest).toBe(true)
    
    // Test error state accessibility
    await page.click('button[type="submit"]')
    await page.waitForSelector('[role="alert"]')
    
    const errorMessage = page.locator('[role="alert"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite')
  })

  test('dashboard accessibility', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="dashboard-stats"]')
    
    const results = await accessibilityTester.runAxeAnalysis()
    await accessibilityTester.generateA11yReport(results, 'Dashboard')
    
    expect(results.violations).toHaveLength(0)
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // Ensure there's only one h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
    
    // Test skip link
    await page.keyboard.press('Tab')
    const skipLink = page.locator('[data-testid="skip-link"]')
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeFocused()
      await skipLink.click()
      // Should skip to main content
      await expect(page.locator('main')).toBeFocused()
    }
  })

  test('search form accessibility', async ({ page }) => {
    await page.goto('/dashboard/search')
    await page.waitForLoadState('networkidle')
    
    const results = await accessibilityTester.runAxeAnalysis()
    await accessibilityTester.generateA11yReport(results, 'Search Form')
    
    expect(results.violations).toHaveLength(0)
    
    // Test form labels and ARIA attributes
    const industryInput = page.locator('input[name="industry"]')
    const cityInput = page.locator('input[name="city"]')
    const stateSelect = page.locator('select[name="state"]')
    
    await expect(industryInput).toHaveAttribute('aria-label')
    await expect(cityInput).toHaveAttribute('aria-label')
    await expect(stateSelect).toHaveAttribute('aria-label')
    
    // Test fieldset and legend for grouped form elements
    const fieldset = page.locator('fieldset')
    if (await fieldset.count() > 0) {
      await expect(fieldset.locator('legend')).toBeVisible()
    }
    
    // Test autocomplete attributes
    await expect(industryInput).toHaveAttribute('autocomplete')
    
    // Test keyboard navigation
    const searchFormKeyboard = await accessibilityTester.testKeyboardNavigation({
      startSelector: 'input[name="industry"]',
      expectedStops: ['industry', 'city', 'state', 'submit'],
      description: 'Search form fields'
    })
    
    expect(searchFormKeyboard).toBe(true)
  })

  test('search results accessibility', async ({ page }) => {
    // Mock search results
    await page.route('**/api/search/companies', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                name: 'Accessible Test Restaurant',
                formatted_address: '123 A11y St, Test City, AC 12345',
                rating: 4.5,
                user_ratings_total: 150,
                place_id: 'a11y_test_1',
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
    await page.fill('input[name="city"]', 'Test City')
    await page.selectOption('select[name="state"]', 'AC')
    await page.click('button[type="submit"]')
    
    await page.waitForSelector('[data-testid="search-results"]')
    
    const results = await accessibilityTester.runAxeAnalysis()
    await accessibilityTester.generateA11yReport(results, 'Search Results')
    
    expect(results.violations).toHaveLength(0)
    
    // Test results list structure
    const resultsList = page.locator('[role="list"], ul, [data-testid="search-results"]')
    await expect(resultsList).toBeVisible()
    
    // Test result items
    const resultItems = page.locator('[data-testid="company-card"]')
    const itemCount = await resultItems.count()
    expect(itemCount).toBeGreaterThan(0)
    
    // Each result should be keyboard accessible
    for (let i = 0; i < itemCount; i++) {
      const item = resultItems.nth(i)
      await item.focus()
      await expect(item).toBeFocused()
      
      // Should have accessible name
      const accessibleName = await item.getAttribute('aria-label') || 
                           await item.locator('h3, h2').first().textContent()
      expect(accessibleName).toBeTruthy()
    }
  })

  test('modal accessibility', async ({ page }) => {
    await page.goto('/dashboard/companies')
    await page.waitForLoadState('networkidle')
    
    // Open company details modal
    await page.click('[data-testid="company-card"]:first-child')
    await page.waitForSelector('[data-testid="company-modal"]')
    
    const modal = page.locator('[data-testid="company-modal"]')
    
    // Test modal ARIA attributes
    await expect(modal).toHaveAttribute('role', 'dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    await expect(modal).toHaveAttribute('aria-labelledby')
    
    // Test focus management
    const modalTitle = modal.locator('h2, [data-testid="modal-title"]')
    await expect(modalTitle).toBeFocused()
    
    // Test escape key closes modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
    
    // Focus should return to trigger element
    await expect(page.locator('[data-testid="company-card"]:first-child')).toBeFocused()
  })

  test('data table accessibility', async ({ page }) => {
    await page.goto('/dashboard/companies')
    await page.waitForLoadState('networkidle')
    
    const table = page.locator('table')
    if (await table.count() > 0) {
      // Test table structure
      await expect(table).toHaveAttribute('role', 'table')
      
      const headers = table.locator('th')
      const headerCount = await headers.count()
      
      if (headerCount > 0) {
        // Each header should have proper scope
        for (let i = 0; i < headerCount; i++) {
          const header = headers.nth(i)
          const scope = await header.getAttribute('scope')
          expect(scope).toBe('col')
        }
      }
      
      // Test sortable columns
      const sortableHeaders = table.locator('th[aria-sort]')
      const sortableCount = await sortableHeaders.count()
      
      for (let i = 0; i < sortableCount; i++) {
        const header = sortableHeaders.nth(i)
        await expect(header).toHaveAttribute('tabindex', '0')
        await expect(header).toHaveAttribute('role', 'button')
      }
    }
  })

  test('form validation accessibility', async ({ page }) => {
    await page.goto('/dashboard/search')
    
    // Submit empty form to trigger validation
    await page.click('button[type="submit"]')
    
    // Wait for error messages
    await page.waitForSelector('[role="alert"], .error-message')
    
    const errorMessages = page.locator('[role="alert"], .error-message')
    const errorCount = await errorMessages.count()
    
    for (let i = 0; i < errorCount; i++) {
      const error = errorMessages.nth(i)
      
      // Error should be announced to screen readers
      await expect(error).toHaveAttribute('aria-live')
      
      // Error should be associated with the relevant field
      const ariaDescribedBy = await error.getAttribute('aria-describedby')
      if (ariaDescribedBy) {
        const relatedField = page.locator(`[aria-describedby="${ariaDescribedBy}"]`)
        await expect(relatedField).toBeVisible()
      }
    }
  })

  test('color contrast compliance', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await accessibilityTester.testColorContrast()
    
    // Run axe color contrast specific test
    const results = await new AxeBuilder({ page })
      .include('body')
      .withRules(['color-contrast'])
      .analyze()
    
    expect(results.violations).toHaveLength(0)
  })

  test('screen reader content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await accessibilityTester.testScreenReaderContent()
    
    // Test for proper heading hierarchy
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      return Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim() || ''
      }))
    })
    
    // Should start with h1
    expect(headings[0]?.level).toBe(1)
    
    // No skipped heading levels
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level
      const previousLevel = headings[i - 1].level
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
    }
  })

  test('reduced motion accessibility', async ({ page }) => {
    // Test with prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const animated = []
      
      for (const el of elements) {
        const style = window.getComputedStyle(el)
        if (style.animationDuration !== '0s' && style.animationDuration !== '') {
          animated.push({
            element: el.tagName,
            duration: style.animationDuration,
            name: style.animationName
          })
        }
      }
      
      return animated
    })
    
    // With reduced motion, animations should be minimal or disabled
    const longAnimations = animatedElements.filter(anim => 
      parseFloat(anim.duration) > 0.5 // More than 500ms
    )
    
    expect(longAnimations.length).toBe(0)
  })
})

// High contrast mode testing
test.describe('High Contrast Mode Accessibility', () => {
  test('high contrast mode compatibility', async ({ page }) => {
    // Simulate Windows high contrast mode
    await page.addInitScript(() => {
      // Add high contrast media query simulation
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('prefers-contrast: high'),
          addEventListener: () => {},
          removeEventListener: () => {}
        })
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Test that content is still visible and accessible in high contrast mode
    const visibleText = await page.textContent('body')
    expect(visibleText).toBeTruthy()
    expect(visibleText!.length).toBeGreaterThan(100)
    
    // Test that interactive elements are still focusable
    const focusableElements = page.locator('button, a, input, select, textarea, [tabindex="0"]')
    const count = await focusableElements.count()
    expect(count).toBeGreaterThan(0)
  })
})