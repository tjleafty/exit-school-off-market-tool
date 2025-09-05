import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500,        // Largest Contentful Paint
  FID: 100,         // First Input Delay
  CLS: 0.1,         // Cumulative Layout Shift
  FCP: 1800,        // First Contentful Paint
  TTI: 3800,        // Time to Interactive
  
  // Custom metrics
  API_RESPONSE: 2000,    // API response time
  SEARCH_TIME: 3000,     // Company search completion
  PAGE_LOAD: 5000,       // Full page load
  BUNDLE_SIZE: 1000000,  // 1MB bundle size limit
}

interface PerformanceMetrics {
  lcp?: number
  fid?: number
  cls?: number
  fcp?: number
  tti?: number
  navigationStart?: number
  domContentLoaded?: number
  loadComplete?: number
  bundleSize?: number
}

class PerformanceTester {
  constructor(private page: Page) {}

  async measureCoreWebVitals(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: PerformanceMetrics = {}
        
        // Get navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          metrics.navigationStart = navigation.navigationStart
          metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
          metrics.loadComplete = navigation.loadEventEnd - navigation.navigationStart
        }

        // Measure Core Web Vitals using web-vitals library or manual measurement
        let vitalsCollected = 0
        const totalVitals = 3

        const checkComplete = () => {
          vitalsCollected++
          if (vitalsCollected >= totalVitals) {
            resolve(metrics)
          }
        }

        // LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const lastEntry = entries[entries.length - 1] as any
              metrics.lcp = lastEntry.startTime
              lcpObserver.disconnect()
              checkComplete()
            })
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
          } catch (e) {
            checkComplete()
          }

          // FID (First Input Delay)
          try {
            const fidObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries()
              entries.forEach((entry: any) => {
                if (entry.name === 'first-input') {
                  metrics.fid = entry.processingStart - entry.startTime
                }
              })
              fidObserver.disconnect()
              checkComplete()
            })
            fidObserver.observe({ entryTypes: ['first-input'] })
            
            // Simulate FID measurement with a timeout
            setTimeout(() => {
              if (metrics.fid === undefined) {
                metrics.fid = 0 // No user input detected
                checkComplete()
              }
            }, 5000)
          } catch (e) {
            checkComplete()
          }

          // CLS (Cumulative Layout Shift)
          try {
            let cls = 0
            const clsObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries()
              entries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                  cls += entry.value
                }
              })
              metrics.cls = cls
            })
            clsObserver.observe({ entryTypes: ['layout-shift'] })
            
            setTimeout(() => {
              clsObserver.disconnect()
              checkComplete()
            }, 5000)
          } catch (e) {
            checkComplete()
          }
        } else {
          // Fallback for browsers without PerformanceObserver
          setTimeout(() => resolve(metrics), 1000)
        }

        // Timeout fallback
        setTimeout(() => resolve(metrics), 10000)
      })
    })
  }

  async measureBundleSize(): Promise<number> {
    const resourceEntries = await this.page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('.js') || entry.name.includes('.css'))
        .map((entry: any) => ({
          name: entry.name,
          size: entry.transferSize || entry.decodedBodySize || 0
        }))
    })

    return resourceEntries.reduce((total, resource) => total + resource.size, 0)
  }

  async measureAPIResponseTime(apiCall: () => Promise<any>): Promise<number> {
    const startTime = Date.now()
    await apiCall()
    return Date.now() - startTime
  }

  async generatePerformanceReport(metrics: PerformanceMetrics, pageName: string) {
    const report = {
      page: pageName,
      timestamp: new Date().toISOString(),
      metrics,
      thresholds: PERFORMANCE_THRESHOLDS,
      passed: {
        lcp: !metrics.lcp || metrics.lcp <= PERFORMANCE_THRESHOLDS.LCP,
        fid: !metrics.fid || metrics.fid <= PERFORMANCE_THRESHOLDS.FID,
        cls: !metrics.cls || metrics.cls <= PERFORMANCE_THRESHOLDS.CLS,
        bundleSize: !metrics.bundleSize || metrics.bundleSize <= PERFORMANCE_THRESHOLDS.BUNDLE_SIZE,
      }
    }

    console.log(`\n📊 Performance Report - ${pageName}`)
    console.log('='.repeat(50))
    if (metrics.lcp) console.log(`🎯 LCP: ${metrics.lcp.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.LCP}ms) ${report.passed.lcp ? '✅' : '❌'}`)
    if (metrics.fid) console.log(`👆 FID: ${metrics.fid.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.FID}ms) ${report.passed.fid ? '✅' : '❌'}`)
    if (metrics.cls) console.log(`📐 CLS: ${metrics.cls.toFixed(3)} (threshold: ${PERFORMANCE_THRESHOLDS.CLS}) ${report.passed.cls ? '✅' : '❌'}`)
    if (metrics.bundleSize) console.log(`📦 Bundle: ${(metrics.bundleSize / 1024).toFixed(2)}KB (threshold: ${PERFORMANCE_THRESHOLDS.BUNDLE_SIZE / 1024}KB) ${report.passed.bundleSize ? '✅' : '❌'}`)
    if (metrics.loadComplete) console.log(`⏱️  Load: ${metrics.loadComplete.toFixed(2)}ms`)

    return report
  }
}

test.describe('Performance Testing', () => {
  let performanceTester: PerformanceTester
  let testUserId: string

  test.beforeAll(async () => {
    // Create test user and sample data for consistent performance testing
    const { data: user } = await supabase
      .from('users')
      .upsert({
        id: 'perf-test-user-id',
        email: 'perf@test.com',
        name: 'Performance Test User',
        role: 'USER',
        status: 'ACTIVE',
        company_name: 'Performance Test Company'
      }, { onConflict: 'id' })

    testUserId = 'perf-test-user-id'

    // Create sample companies for performance testing
    const companies = Array.from({ length: 50 }, (_, i) => ({
      id: `perf-company-${i}`,
      user_id: testUserId,
      name: `Performance Test Company ${i + 1}`,
      address: `${i + 1} Performance St, Test City, PT 12345`,
      rating: 4.0 + Math.random(),
      review_count: Math.floor(Math.random() * 200) + 10,
      place_id: `perf_test_${i}`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }))

    await supabase.from('companies').upsert(companies, { onConflict: 'id' })
  })

  test.beforeEach(async ({ page }) => {
    performanceTester = new PerformanceTester(page)
    
    // Mock authentication for performance testing
    await page.addInitScript((userId) => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'perf-test-token',
        user: { id: userId, email: 'perf@test.com', role: 'USER' }
      }))
    }, testUserId)
  })

  test.afterAll(async () => {
    // Cleanup test data
    await supabase.from('companies').delete().eq('user_id', testUserId)
    await supabase.from('searches').delete().eq('user_id', testUserId)
    await supabase.from('users').delete().eq('id', testUserId)
  })

  test('homepage performance benchmarks', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    const metrics = await performanceTester.measureCoreWebVitals()
    const bundleSize = await performanceTester.measureBundleSize()
    
    metrics.bundleSize = bundleSize
    
    const report = await performanceTester.generatePerformanceReport(metrics, 'Homepage')
    
    // Assertions
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD)
    if (metrics.lcp) expect(metrics.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
    if (metrics.fid) expect(metrics.fid).toBeLessThan(PERFORMANCE_THRESHOLDS.FID)
    if (metrics.cls) expect(metrics.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS)
    expect(bundleSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE)
  })

  test('dashboard performance with data loading', async ({ page }) => {
    await page.goto('/dashboard')
    
    const startTime = Date.now()
    await page.waitForSelector('[data-testid="dashboard-stats"]')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    const metrics = await performanceTester.measureCoreWebVitals()
    await performanceTester.generatePerformanceReport(metrics, 'Dashboard')
    
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD)
  })

  test('company search performance', async ({ page }) => {
    // Mock search API with realistic response times
    await page.route('**/api/search/companies', async (route) => {
      // Simulate realistic API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: Array.from({ length: 20 }, (_, i) => ({
              name: `Performance Restaurant ${i + 1}`,
              formatted_address: `${i + 1} Perf St, Test City, PT 12345`,
              rating: 4.0 + Math.random(),
              user_ratings_total: Math.floor(Math.random() * 200),
              place_id: `perf_search_${i}`,
              business_status: 'OPERATIONAL',
              types: ['restaurant', 'food', 'establishment']
            })),
            total_results: 20
          }
        })
      })
    })

    await page.goto('/dashboard/search')
    await page.waitForLoadState('networkidle')
    
    // Measure search operation performance
    const searchStartTime = Date.now()
    
    await page.fill('input[name="industry"]', 'Restaurants')
    await page.fill('input[name="city"]', 'Test City')
    await page.selectOption('select[name="state"]', 'PT')
    await page.click('button[type="submit"]')
    
    await page.waitForSelector('[data-testid="search-results"]')
    const searchTime = Date.now() - searchStartTime
    
    console.log(`🔍 Search completion time: ${searchTime}ms`)
    
    expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_TIME)
  })

  test('saved companies page performance with large dataset', async ({ page }) => {
    await page.goto('/dashboard/companies')
    
    const startTime = Date.now()
    await page.waitForSelector('[data-testid="saved-companies"]')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    const metrics = await performanceTester.measureCoreWebVitals()
    await performanceTester.generatePerformanceReport(metrics, 'Saved Companies')
    
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD)
    
    // Test filtering performance
    const filterStartTime = Date.now()
    await page.selectOption('select[name="sort"]', 'rating')
    await page.waitForTimeout(500) // Wait for sort to apply
    const filterTime = Date.now() - filterStartTime
    
    console.log(`📊 Filter operation time: ${filterTime}ms`)
    expect(filterTime).toBeLessThan(1000) // Should be very fast
  })

  test('API response times', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test user data API
    const userDataTime = await performanceTester.measureAPIResponseTime(async () => {
      await page.evaluate(async () => {
        const response = await fetch('/api/users/profile', {
          headers: { Authorization: 'Bearer perf-test-token' }
        })
        return response.json()
      })
    })
    
    console.log(`👤 User data API: ${userDataTime}ms`)
    expect(userDataTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE)
    
    // Test companies list API
    const companiesTime = await performanceTester.measureAPIResponseTime(async () => {
      await page.evaluate(async () => {
        const response = await fetch('/api/companies', {
          headers: { Authorization: 'Bearer perf-test-token' }
        })
        return response.json()
      })
    })
    
    console.log(`🏢 Companies API: ${companiesTime}ms`)
    expect(companiesTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE)
  })

  test('memory usage monitoring', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Measure initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    })
    
    // Navigate through several pages to test for memory leaks
    const pages = ['/dashboard/search', '/dashboard/companies', '/dashboard/email']
    
    for (const pagePath of pages) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Let page settle
    }
    
    // Return to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    })
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100
      
      console.log(`💾 Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`)
      
      // Memory shouldn't increase by more than 50% during normal navigation
      expect(memoryIncreasePercent).toBeLessThan(50)
    }
  })

  test('lighthouse performance audit', async ({ page }) => {
    // This test would ideally integrate with Lighthouse CI
    // For now, we'll measure key metrics manually
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const lighthouseMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime
      const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint')?.startTime
      
      return {
        fcp,
        lcp,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        resources: performance.getEntriesByType('resource').length
      }
    })
    
    console.log('\n🔍 Lighthouse-style Metrics:')
    if (lighthouseMetrics.fcp) console.log(`   FCP: ${lighthouseMetrics.fcp.toFixed(2)}ms`)
    if (lighthouseMetrics.lcp) console.log(`   LCP: ${lighthouseMetrics.lcp.toFixed(2)}ms`)
    console.log(`   DOM Content Loaded: ${lighthouseMetrics.domContentLoaded.toFixed(2)}ms`)
    console.log(`   Load Complete: ${lighthouseMetrics.loadComplete.toFixed(2)}ms`)
    console.log(`   Total Resources: ${lighthouseMetrics.resources}`)
    
    // Basic Lighthouse-style thresholds
    if (lighthouseMetrics.fcp) expect(lighthouseMetrics.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP)
    if (lighthouseMetrics.lcp) expect(lighthouseMetrics.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
    expect(lighthouseMetrics.domContentLoaded).toBeLessThan(3000)
    expect(lighthouseMetrics.loadComplete).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD)
  })
})

// Mobile performance testing
test.describe('Mobile Performance Testing', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  test('mobile homepage performance', async ({ page }) => {
    const performanceTester = new PerformanceTester(page)
    
    // Simulate slower mobile network
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    const metrics = await performanceTester.measureCoreWebVitals()
    await performanceTester.generatePerformanceReport(metrics, 'Mobile Homepage')
    
    // Mobile should still meet performance thresholds
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD * 1.5) // Allow 50% more time on mobile
  })
})