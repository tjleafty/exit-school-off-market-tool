# Exit School Off-Market Tool - Testing Strategy with Claude

A comprehensive testing strategy utilizing Claude AI for test generation, covering unit tests, integration tests, E2E tests, performance testing, visual regression, and accessibility compliance.

## 📋 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Claude Test Generation](#claude-test-generation)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Visual Regression Testing](#visual-regression-testing)
7. [Performance Testing](#performance-testing)
8. [Accessibility Testing](#accessibility-testing)
9. [CI/CD Integration](#cicd-integration)
10. [Test Data Management](#test-data-management)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

## 🎯 Testing Philosophy

Our testing strategy follows the testing pyramid with these principles:

- **Test Early, Test Often**: Integrated into development workflow
- **Claude-Powered**: AI-generated tests for consistency and coverage
- **Accessibility First**: WCAG 2.1 AA compliance in all tests
- **Performance Focused**: Core Web Vitals and loading performance
- **User-Centric**: Tests reflect real user journeys and scenarios
- **Maintainable**: Tests are documented and easy to understand

### Test Coverage Goals

- **Unit Tests**: 80%+ line coverage
- **Integration Tests**: All API endpoints and user flows
- **E2E Tests**: Critical user journeys and business logic
- **Accessibility**: WCAG 2.1 AA compliance across all pages
- **Performance**: Core Web Vitals within thresholds
- **Visual**: UI consistency across browsers and devices

## 🤖 Claude Test Generation

### Available Test Generators

#### Unit Tests
```bash
# Generate unit test for a component
npm run claude:test components/SearchForm unit

# Generate unit test for a hook
npm run claude:test hooks/useUserData unit
```

#### Integration Tests
```bash
# Generate integration test for API flow
npm run claude:test auth-flow integration

# Generate integration test for database operations
npm run claude:test company-management integration
```

#### End-to-End Tests
```bash
# Generate E2E test for user workflow
npm run claude:test onboarding-flow e2e

# Generate E2E test for complex scenarios
npm run claude:test company-search-workflow e2e
```

#### Performance Tests
```bash
# Generate performance test for page
npm run claude:test dashboard-page performance

# Generate API performance test
npm run claude:test search-api performance
```

### Using Generated Test Prompts

1. **Run the generator:**
   ```bash
   npm run claude:test:e2e onboarding-flow
   ```

2. **Copy your implementation code** into the `[PASTE YOUR CODE HERE]` section

3. **Paste the prompt into Claude** and review the generated test

4. **Save the test file** to the appropriate directory:
   - Unit tests: `__tests__/components/`, `__tests__/hooks/`, `__tests__/lib/`
   - Integration tests: `__tests__/integration/`
   - E2E tests: `__tests__/e2e/`

5. **Run and iterate:**
   ```bash
   npm run test
   npm run test:e2e
   ```

## 🧪 Unit Testing

### Framework: Jest + React Testing Library

### Test Structure

```typescript
// __tests__/components/SearchForm.test.tsx
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { SearchForm } from '@/components/search/SearchForm'

describe('SearchForm', () => {
  it('renders without crashing', () => {
    render(<SearchForm onSubmit={jest.fn()} />)
    expect(screen.getByText('Search for Companies')).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const mockOnSubmit = jest.fn()
    render(<SearchForm onSubmit={mockOnSubmit} />)
    
    fireEvent.change(screen.getByLabelText(/industry/i), { 
      target: { value: 'Restaurants' } 
    })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        industry: 'Restaurants',
        city: expect.any(String),
        state: expect.any(String),
      })
    })
  })
})
```

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Debug tests
npm run test:debug
```

### Mocking Strategy

- **Supabase Client**: Mocked in `jest.setup.js`
- **Next.js Router**: Mocked navigation hooks
- **TanStack Query**: Mocked with test utilities
- **External APIs**: Mocked with realistic responses

## 🔗 Integration Testing

### Testing Real Interactions

Integration tests validate the interaction between components, APIs, and database:

```typescript
// __tests__/integration/auth-flow.test.ts
describe('Authentication Flow', () => {
  it('complete login flow', async () => {
    // Test real API calls with test database
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
    
    expect(response.status).toBe(200)
    expect(response.body.user).toBeDefined()
  })
})
```

### Running Integration Tests

```bash
# Run integration tests with test database
npm run test:integration

# Run specific integration test
npm run test -- __tests__/integration/auth-flow.test.ts
```

## 🌐 End-to-End Testing

### Framework: Playwright

### Test Coverage

#### Critical User Journeys
- ✅ Complete onboarding flow (request → approval → activation)
- ✅ Company search and save workflow
- ✅ Email campaign creation and management
- ✅ Report generation and sharing
- ✅ Admin approval processes

#### Example E2E Test

```typescript
// __tests__/e2e/onboarding.spec.ts
test('complete onboarding flow', async ({ page }) => {
  // 1. Request account
  await page.goto('/request')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.click('button[type="submit"]')
  
  // 2. Admin approves (using database directly)
  await supabase.from('users').update({ status: 'APPROVED' })
  
  // 3. User accepts invitation
  await page.goto('/accept?token=test-token')
  await page.fill('input[type="password"]', 'SecurePassword123!')
  await page.click('button:has-text("Create Account")')
  
  // 4. Verify dashboard access
  await expect(page).toHaveURL('/dashboard')
})
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test onboarding.spec.ts
```

### Multi-Browser Testing

Tests run on:
- ✅ Desktop Chrome, Firefox, Safari
- ✅ Mobile Chrome, Safari (iPhone/Android)
- ✅ Tablet (iPad Pro)

## 📸 Visual Regression Testing

### Screenshot Comparison

Visual tests ensure UI consistency across changes:

```typescript
// Visual regression test
test('homepage visual consistency', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Hide dynamic content
  await page.addStyleTag({
    content: '[data-testid="current-time"] { visibility: hidden; }'
  })
  
  await expect(page).toHaveScreenshot('homepage-desktop.png', {
    threshold: 0.2,
    animations: 'disabled'
  })
})
```

### Test Coverage

- ✅ Homepage (light/dark mode)
- ✅ Dashboard layouts
- ✅ Search results and forms
- ✅ Email templates editor
- ✅ Modal dialogs
- ✅ Mobile responsive views

### Running Visual Tests

```bash
# Run visual regression tests
npx playwright test visual-regression.spec.ts

# Update baseline screenshots
npx playwright test --update-snapshots

# Compare screenshots
npx playwright show-report
```

## ⚡ Performance Testing

### Core Web Vitals Monitoring

Performance tests ensure optimal loading times:

```typescript
test('homepage performance benchmarks', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const metrics = await page.evaluate(() => {
    return {
      lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      fid: performance.getEntriesByType('first-input')[0]?.processingStart,
      cls: performance.getEntriesByType('layout-shift')
        .reduce((cls, entry) => cls + entry.value, 0)
    }
  })
  
  expect(metrics.lcp).toBeLessThan(2500) // 2.5s threshold
  expect(metrics.fid).toBeLessThan(100)  // 100ms threshold  
  expect(metrics.cls).toBeLessThan(0.1)  // 0.1 threshold
})
```

### Performance Thresholds

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Page Load Time**: < 5s
- **API Response Time**: < 2s
- **Bundle Size**: < 1MB

### Running Performance Tests

```bash
# Run performance tests
npx playwright test performance.spec.ts

# Run with performance profiling
npx playwright test --trace=on

# Generate Lighthouse reports
npm run lighthouse
```

## ♿ Accessibility Testing

### WCAG 2.1 AA Compliance

Accessibility tests ensure the app works for all users:

```typescript
test('homepage accessibility compliance', async ({ page }) => {
  await page.goto('/')
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  
  expect(accessibilityScanResults.violations).toEqual([])
})
```

### Test Coverage

#### Automated Testing (axe-core)
- ✅ ARIA attributes and roles
- ✅ Color contrast ratios
- ✅ Keyboard navigation
- ✅ Form labels and validation
- ✅ Heading hierarchy
- ✅ Alt text for images

#### Manual Testing Scenarios
- ✅ Screen reader compatibility
- ✅ Keyboard-only navigation
- ✅ High contrast mode
- ✅ Reduced motion preferences
- ✅ Focus management in modals

### Running Accessibility Tests

```bash
# Run accessibility tests
npx playwright test accessibility.spec.ts

# Run with screen reader simulation
npx playwright test --headed accessibility.spec.ts
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:ci
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Run accessibility tests
        run: npx playwright test accessibility.spec.ts
        
      - name: Run performance tests
        run: npx playwright test performance.spec.ts
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### Test Pipeline

1. **Pre-commit**: Linting, type checking, basic unit tests
2. **Pull Request**: Full test suite including E2E
3. **Main Branch**: Performance and visual regression tests
4. **Deployment**: Health checks and smoke tests

## 🗃️ Test Data Management

### Test Database

- **Separate test database** for integration and E2E tests
- **Deterministic test data** for consistent results
- **Automatic cleanup** after test runs
- **Realistic data volumes** for performance testing

### Test User Management

```typescript
// Test data setup
const TEST_USERS = {
  admin: {
    id: 'test-admin-id',
    email: 'admin@exitschool.com',
    role: 'ADMIN'
  },
  user: {
    id: 'test-user-id', 
    email: 'test@example.com',
    role: 'USER'
  }
}

// Global setup in E2E tests
test.beforeAll(async () => {
  await createTestUsers()
  await createTestData()
})

test.afterAll(async () => {
  await cleanupTestData()
})
```

## 🏆 Best Practices

### Test Writing Guidelines

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Test names explain what they test
3. **Single Responsibility**: One test per behavior
4. **Independent Tests**: No dependencies between tests
5. **Realistic Data**: Use realistic test data and scenarios

### Code Examples

#### Good Test ✅
```typescript
test('displays validation error when email is invalid', async () => {
  // Arrange
  render(<LoginForm />)
  
  // Act
  await user.type(screen.getByLabelText(/email/i), 'invalid-email')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  // Assert
  expect(screen.getByText('Please enter a valid email')).toBeVisible()
})
```

#### Poor Test ❌
```typescript
test('form works', async () => {
  render(<LoginForm />)
  // Tests too many things at once, unclear what it's testing
})
```

### Performance Guidelines

- **Parallel Execution**: Run tests in parallel where possible
- **Smart Waiting**: Use `waitFor` instead of arbitrary timeouts
- **Minimal Setup**: Only create necessary test data
- **Resource Cleanup**: Always clean up after tests

### Accessibility Guidelines

- **Real User Testing**: Include users with disabilities in testing
- **Multiple Tools**: Use axe-core + manual testing
- **Progressive Enhancement**: Test without JavaScript enabled
- **Assistive Technology**: Test with actual screen readers

## 🐛 Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout
npx playwright test --timeout=60000

# Check for network issues
npm run test:debug
```

#### Flaky Visual Tests
```bash
# Update baseline screenshots
npx playwright test --update-snapshots

# Check for animation issues
# Add: animations: 'disabled' to test config
```

#### Database Connection Issues
```bash
# Check environment variables
npm run health-check

# Reset test database
npm run test:db:reset
```

#### Accessibility Test Failures
```bash
# Run specific accessibility test with details
npx playwright test accessibility.spec.ts --headed

# Check axe-core rules documentation
# https://dequeuniversity.com/rules/axe/
```

### Debugging Tools

- **Playwright Inspector**: `npx playwright test --debug`
- **Test Results**: `npx playwright show-report`
- **Coverage Reports**: `npm run test:coverage`
- **Performance Traces**: `npx playwright test --trace=on`

### Getting Help

1. **Check test output** for specific error messages
2. **Review test artifacts** in `test-results/`
3. **Run health checks** to verify environment setup
4. **Check GitHub Actions logs** for CI failures
5. **Use Claude test generators** for consistent test patterns

## 📊 Test Metrics and Reporting

### Coverage Reports

```bash
# Generate comprehensive coverage report
npm run test:coverage

# View coverage report in browser
open coverage/lcov-report/index.html
```

### Performance Reports

```bash
# Generate performance benchmark report
npm run test:performance

# View Lighthouse results
npm run lighthouse:ci
```

### Accessibility Reports

```bash
# Generate accessibility compliance report
npm run test:accessibility

# Export results for compliance documentation
npx playwright test accessibility.spec.ts --reporter=json
```

---

## 🎯 Quick Reference

### Daily Development Workflow

1. **Write feature code**
2. **Generate tests with Claude**:
   ```bash
   npm run claude:test MyComponent unit
   ```
3. **Run tests locally**:
   ```bash
   npm run test:watch
   ```
4. **Run E2E tests**:
   ```bash
   npm run test:e2e
   ```
5. **Check accessibility**:
   ```bash
   npx playwright test accessibility.spec.ts
   ```
6. **Commit and push** (CI runs full test suite)

### Before Deployment

```bash
# Full test suite
npm run test:ci
npm run test:e2e
npm run test:accessibility
npm run test:performance

# Health check
npm run health-check

# Deploy
npm run deploy:prod
```

This comprehensive testing strategy ensures the Exit School Off-Market Tool is robust, accessible, performant, and maintainable while leveraging Claude AI for consistent and thorough test coverage.