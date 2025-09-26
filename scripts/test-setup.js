#!/usr/bin/env node

/**
 * Testing and CI Setup Script
 * Configures Jest, testing utilities, and CI/CD workflows
 */

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function createFile(filepath, content, description) {
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content)
    log('green', `✅ Created ${description}: ${filepath}`)
    return true
  } else {
    log('blue', `ℹ️  ${description} already exists: ${filepath}`)
    return false
  }
}

async function createJestConfig() {
  log('cyan', '🧪 Setting up Jest configuration...')
  
  const jestConfig = `const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    // Handle module aliases (if you're using them in your Next.js app)
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
  verbose: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
`
  
  createFile('jest.config.js', jestConfig, 'Jest configuration')
}

async function createJestSetup() {
  log('cyan', '🔧 Setting up Jest test environment...')
  
  const jestSetup = `import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  })),
  createServerClient: jest.fn(),
}))

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    isError: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}))

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  })),
}))

// Global test utilities
global.mockSupabaseResponse = (data = null, error = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
})

global.mockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  status: 'ACTIVE',
  company_name: 'Test Company',
  created_at: new Date().toISOString(),
  ...overrides,
})

// Suppress console.error during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
`
  
  createFile('jest.setup.js', jestSetup, 'Jest setup file')
}

async function createTestUtils() {
  log('cyan', '🛠️  Creating test utilities...')
  
  const testUtils = `import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }

// Additional test utilities
export const createMockRouter = (overrides = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  ...overrides,
})

export const createMockSupabaseClient = (overrides = {}) => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    ...overrides.auth,
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides.from,
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    ...overrides.storage,
  },
  ...overrides,
})

export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver
}

export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}
`
  
  createFile('__tests__/utils/test-utils.tsx', testUtils, 'Test utilities')
}

async function createSampleTests() {
  log('cyan', '📝 Creating sample test files...')
  
  // Component test example
  const componentTest = `import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { SearchForm } from '@/components/search/SearchForm'

describe('SearchForm', () => {
  it('renders without crashing', () => {
    render(<SearchForm onSubmit={jest.fn()} />)
    expect(screen.getByText('Search for Companies')).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const mockOnSubmit = jest.fn()
    render(<SearchForm onSubmit={mockOnSubmit} />)
    
    const industryInput = screen.getByLabelText(/industry/i)
    const cityInput = screen.getByLabelText(/city/i)
    const submitButton = screen.getByRole('button', { name: /search/i })
    
    fireEvent.change(industryInput, { target: { value: 'Restaurants' } })
    fireEvent.change(cityInput, { target: { value: 'Seattle' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        industry: 'Restaurants',
        city: 'Seattle',
        state: expect.any(String),
      })
    })
  })

  it('shows validation errors for empty fields', async () => {
    render(<SearchForm onSubmit={jest.fn()} />)
    
    const submitButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/industry is required/i)).toBeInTheDocument()
      expect(screen.getByText(/city is required/i)).toBeInTheDocument()
    })
  })
})
`
  
  createFile('__tests__/components/SearchForm.test.tsx', componentTest, 'Sample component test')
  
  // API test example
  const apiTest = `import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/searches/route'

describe('/api/searches', () => {
  it('creates a new search', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: 'Restaurants',
        city: 'Seattle',
        state: 'WA',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(201)
    
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('id')
  })

  it('validates required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: '',
        city: '',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.error).toContain('validation')
  })

  it('handles database errors', async () => {
    // Mock database error
    jest.mock('@/lib/supabase', () => ({
      createClient: () => ({
        from: () => ({
          insert: () => ({
            select: () => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })
    }))

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: 'Restaurants',
        city: 'Seattle',
        state: 'WA',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
  })
})
`
  
  createFile('__tests__/api/searches.test.ts', apiTest, 'Sample API test')
  
  // Hook test example
  const hookTest = `import { renderHook, waitFor } from '../utils/test-utils'
import { useUserSearches } from '@/hooks/useUserSearches'
import { createMockSupabaseClient } from '../utils/test-utils'

const mockSupabase = createMockSupabaseClient()

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase,
}))

describe('useUserSearches', () => {
  it('fetches user searches successfully', async () => {
    const mockSearches = [
      { id: '1', industry: 'Restaurants', city: 'Seattle' },
      { id: '2', industry: 'Auto Repair', city: 'Portland' },
    ]

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: mockSearches, error: null }),
    })

    const { result } = renderHook(() => useUserSearches('test-user-id'))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSearches)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles fetch errors', async () => {
    const mockError = { message: 'Failed to fetch' }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    })

    const { result } = renderHook(() => useUserSearches('test-user-id'))

    await waitFor(() => {
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })
})
`
  
  createFile('__tests__/hooks/useUserSearches.test.ts', hookTest, 'Sample hook test')
}

async function createGitHubActions() {
  log('cyan', '⚙️  Setting up GitHub Actions workflow...')
  
  const ciWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup test environment
      run: |
        cp .env.local.example .env.local
        echo "SUPABASE_URL=http://localhost:54321" >> .env.local
        echo "SUPABASE_SERVICE_ROLE_KEY=test-key" >> .env.local
        echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321" >> .env.local
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key" >> .env.local
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Build application
      run: npm run build

  deploy-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Vercel CLI
      run: npm install --global vercel@latest
    
    - name: Pull Vercel Environment Information
      run: vercel pull --yes --environment=preview --token=\${{ secrets.VERCEL_TOKEN }}
    
    - name: Build Project Artifacts
      run: vercel build --token=\${{ secrets.VERCEL_TOKEN }}
    
    - name: Deploy Project Artifacts to Vercel
      run: vercel deploy --prebuilt --token=\${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Vercel CLI
      run: npm install --global vercel@latest
    
    - name: Pull Vercel Environment Information
      run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
    
    - name: Build Project Artifacts
      run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
    
    - name: Deploy Project Artifacts to Vercel
      run: vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
    
    - name: Run health check
      run: |
        sleep 30  # Wait for deployment to be ready
        npm run health-check
      env:
        NEXT_PUBLIC_APP_URL: https://your-production-url.vercel.app

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level moderate
    
    - name: Check for vulnerabilities
      uses: actions/dependency-review-action@v3
      if: github.event_name == 'pull_request'

  lighthouse:
    needs: deploy-preview
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Audit URLs using Lighthouse
      uses: treosh/lighthouse-ci-action@v10
      with:
        configPath: ./lighthouse.config.js
        uploadArtifacts: true
        temporaryPublicStorage: true
`
  
  createFile('.github/workflows/ci.yml', ciWorkflow, 'GitHub Actions CI/CD workflow')
}

async function createLighthouseConfig() {
  log('cyan', '💡 Setting up Lighthouse configuration...')
  
  const lighthouseConfig = `module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/login'],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
`
  
  createFile('lighthouse.config.js', lighthouseConfig, 'Lighthouse configuration')
}

async function createPackageScripts() {
  log('cyan', '📦 Adding test scripts to package.json...')
  
  const packageJsonPath = 'package.json'
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    // Add test scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "test": "jest",
      "test:watch": "jest --watch",
      "test:ci": "jest --ci --coverage --watchAll=false",
      "test:coverage": "jest --coverage",
      "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
      "test:e2e": "playwright test",
      "test:e2e:ui": "playwright test --ui",
      "test:setup": "node scripts/test-setup.js",
    }
    
    // Add test-related dev dependencies
    const testDependencies = {
      "@testing-library/jest-dom": "^6.1.4",
      "@testing-library/react": "^14.1.2",
      "@testing-library/user-event": "^14.5.1",
      "@types/jest": "^29.5.8",
      "jest": "^29.7.0",
      "jest-environment-jsdom": "^29.7.0",
      "node-mocks-http": "^1.13.0",
      "@playwright/test": "^1.40.0"
    }
    
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...testDependencies
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    log('green', '✅ Updated package.json with test scripts and dependencies')
  }
}

// Main function
async function main() {
  log('magenta', '🧪 Setting up Testing and CI/CD Configuration')
  log('magenta', '='.repeat(60))
  
  await createJestConfig()
  await createJestSetup()
  await createTestUtils()
  await createSampleTests()
  await createGitHubActions()
  await createLighthouseConfig()
  await createPackageScripts()
  
  log('magenta', '='.repeat(60))
  log('green', '✅ Testing and CI/CD setup completed!')
  log('green', '')
  log('green', 'What was created:')
  log('green', '📁 Jest configuration and setup files')
  log('green', '🛠️  Test utilities and sample tests')
  log('green', '⚙️  GitHub Actions CI/CD workflow')
  log('green', '💡 Lighthouse performance testing')
  log('green', '📦 Package.json test scripts')
  log('green', '')
  log('green', 'Next steps:')
  log('green', '1. Run: npm install (to install test dependencies)')
  log('green', '2. Run: npm run test (to run the test suite)')
  log('green', '3. Configure GitHub secrets for CI/CD:')
  log('green', '   - VERCEL_TOKEN')
  log('green', '   - VERCEL_ORG_ID') 
  log('green', '   - VERCEL_PROJECT_ID')
  log('green', '4. Push to GitHub to trigger the CI/CD pipeline')
  log('green', '')
  log('blue', 'Available test commands:')
  log('blue', '  npm run test          - Run tests once')
  log('blue', '  npm run test:watch    - Run tests in watch mode')
  log('blue', '  npm run test:ci       - Run tests with coverage for CI')
  log('blue', '  npm run test:coverage - Generate coverage report')
  log('blue', '  npm run test:debug    - Debug tests with Node inspector')
  log('blue', '  npm run test:e2e      - Run end-to-end tests')
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Run the script
main()