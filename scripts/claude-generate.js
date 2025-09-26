#!/usr/bin/env node

/**
 * Claude Generation Script
 * Generates prompts for Claude to create components, migrations, tests, and APIs
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Template prompts for different generation types
const CLAUDE_PROMPTS = {
  component: (name) => `# Create React Component: ${name}

Create a comprehensive React component called \`${name}\` for the Exit School Off-Market Tool.

## Requirements:
- TypeScript with proper interfaces and types
- Use shadcn/ui components for consistent styling
- Supabase integration with createClientComponentClient
- TanStack Query for data fetching with proper error handling
- Loading states, error boundaries, and empty states
- Responsive design with mobile optimization
- Proper accessibility (ARIA labels, keyboard navigation)
- Form validation if applicable (using Zod schemas)
- Toast notifications for user feedback

## Technical Context:
- Framework: Next.js 14 with App Router
- Database: Supabase with TypeScript types from Database interface
- UI Library: shadcn/ui components with Tailwind CSS
- State Management: React hooks with TanStack Query
- Authentication: Supabase Auth with middleware protection

## Component Structure:
1. Import statements with proper types
2. Interface definitions for props and data
3. Component with hooks for data fetching
4. Loading and error state handling
5. Main component render with responsive layout
6. Export statement

Please provide the complete component code with all imports and proper TypeScript typing.`,

  migration: (feature) => `# Create Supabase Migration: ${feature}

Create a comprehensive SQL migration for \`${feature}\` in the Exit School Off-Market Tool.

## Requirements:
- Complete table definitions with proper data types
- Primary keys, foreign keys, and constraints
- Row Level Security (RLS) policies for multi-tenant security
- Performance indexes for query optimization
- Triggers for automated timestamps and audit logging
- Comments explaining each section and business logic
- Data validation using CHECK constraints where appropriate

## Technical Context:
- Database: PostgreSQL via Supabase
- Security: Row Level Security with user-based access control
- Performance: Proper indexing for common query patterns
- Audit Trail: Created/updated timestamps and user tracking

## Migration Structure:
1. Table creation with all columns and constraints
2. Indexes for performance optimization
3. RLS policies for security (SELECT, INSERT, UPDATE, DELETE)
4. Triggers for timestamps and audit logging
5. Comments documenting business logic
6. Example data (if applicable)

Please provide the complete SQL migration with proper formatting and comprehensive security policies.`,

  test: (file, type = 'unit') => {
    const testTypes = {
      unit: `# Create Unit Test Suite: ${file}

Create comprehensive unit tests for \`${file}\` in the Exit School Off-Market Tool.

## Requirements:
- Jest testing framework with TypeScript support
- React Testing Library for component testing
- Mock Supabase client with proper typing
- Test all user interactions and edge cases
- Error scenario testing with proper assertions
- Loading state testing
- Accessibility testing with jest-axe
- Performance testing considerations

## Test Coverage:
1. Component rendering without crashes
2. User interactions (clicks, form submissions, etc.)
3. Data loading states (loading, success, error)
4. Error handling and error boundaries
5. Accessibility compliance (ARIA labels, keyboard navigation)
6. Edge cases and boundary conditions
7. Mock API responses and database calls
8. Form validation and error states

## Implementation to test:
[PASTE YOUR CODE HERE]

## Technical Setup:
- Use test utilities from __tests__/utils/test-utils.tsx
- Mock createClientComponentClient from Supabase
- Mock TanStack Query hooks with proper return values
- Mock Next.js router if navigation is tested
- Setup proper test data and fixtures

## Expected Test Structure:
\`\`\`typescript
describe('${file}', () => {
  beforeEach(() => {
    // Setup mocks and test data
  })

  it('renders without crashing', () => {
    // Basic rendering test
  })

  it('handles user interactions correctly', () => {
    // Test clicks, form submissions, etc.
  })

  it('displays loading states appropriately', () => {
    // Test loading indicators
  })

  it('handles error states gracefully', () => {
    // Test error boundaries and error messages
  })

  it('meets accessibility requirements', async () => {
    // Test with jest-axe
  })

  it('handles edge cases and boundary conditions', () => {
    // Test empty states, large datasets, etc.
  })
})
\`\`\`

Please provide the complete test file with proper mocking and comprehensive coverage.`,

      integration: `# Create Integration Test Suite: ${file}

Create comprehensive integration tests for \`${file}\` that test the interaction between multiple components and services.

## Requirements:
- Test real interactions between components
- Test API route integration with database
- Test authentication and authorization flows
- Test data flow from API to UI components
- Test error propagation and handling
- Include database setup and teardown

## Integration Scenarios:
1. End-to-end user workflows
2. API route to database interactions
3. Authentication state changes
4. Real-time data updates
5. Cross-component communication
6. Error boundary propagation

## Implementation to test:
[PASTE YOUR CODE HERE]

## Technical Setup:
- Use real Supabase test database
- Mock external APIs (Google Places, OpenAI, etc.)
- Setup test data fixtures
- Use proper cleanup between tests

Please provide complete integration test suite with realistic scenarios.`,

      e2e: `# Create End-to-End Test Suite: ${file}

Create comprehensive E2E tests using Playwright for \`${file}\` in the Exit School Off-Market Tool.

## Requirements:
- Playwright testing framework
- Test complete user journeys
- Test across different browsers
- Include visual regression tests
- Test responsive design
- Include accessibility checks
- Test performance metrics

## E2E Scenarios:
1. Complete user onboarding flow
2. Search and save companies workflow
3. Email campaign creation and sending
4. Report generation and viewing
5. Admin approval processes
6. Error scenarios and recovery

## Feature to test:
[DESCRIBE THE FEATURE OR WORKFLOW]

## Technical Setup:
- Use real test database (separate from production)
- Setup test users and data
- Include cleanup after tests
- Test across desktop and mobile viewports
- Include screenshot comparisons

## Expected Test Structure:
\`\`\`typescript
test.describe('${file}', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data and navigate to page
  })

  test('completes happy path workflow', async ({ page }) => {
    // Test successful user journey
  })

  test('handles errors gracefully', async ({ page }) => {
    // Test error scenarios
  })

  test('works on mobile devices', async ({ page }) => {
    // Test responsive design
  })

  test('meets accessibility standards', async ({ page }) => {
    // Test with axe-playwright
  })

  test.afterEach(async ({ page }) => {
    // Cleanup test data
  })
})
\`\`\`

Please provide the complete E2E test suite with realistic user scenarios.`,

      performance: `# Create Performance Test Suite: ${file}

Create performance tests for \`${file}\` to ensure optimal loading times and responsiveness.

## Requirements:
- Lighthouse CI integration
- Core Web Vitals testing
- Database query performance
- API response time testing
- Memory usage monitoring
- Bundle size analysis

## Performance Metrics:
1. First Contentful Paint (FCP)
2. Largest Contentful Paint (LCP) 
3. Cumulative Layout Shift (CLS)
4. First Input Delay (FID)
5. Time to Interactive (TTI)
6. API response times
7. Database query performance

## Feature to test:
[DESCRIBE THE FEATURE OR PAGE]

## Technical Setup:
- Use Lighthouse CI for automated audits
- Mock external APIs for consistent results
- Test with realistic data volumes
- Include mobile and desktop testing

Please provide comprehensive performance testing configuration and benchmarks.`
    }

    return testTypes[type] || testTypes.unit
  },

  api: (endpoint) => `# Create API Route: ${endpoint}

Create a robust API route for \`${endpoint}\` in the Exit School Off-Market Tool.

## Requirements:
- Next.js 14 App Router API route structure
- TypeScript with proper request/response types
- Supabase integration with service role key
- Authentication and authorization checks
- Input validation using Zod schemas
- Comprehensive error handling with proper HTTP status codes
- Request logging for debugging and monitoring
- Rate limiting considerations
- CORS handling if needed

## Technical Context:
- Framework: Next.js 14 App Router (app/api/)
- Database: Supabase with service role access
- Authentication: Verify user sessions and permissions
- Validation: Zod schemas for request/response validation
- Security: Proper sanitization and authorization checks

## API Structure:
1. Request/response type definitions
2. Authentication and authorization checks
3. Input validation with Zod schemas
4. Business logic with proper error handling
5. Database operations with transactions
6. Response formatting with consistent structure
7. Comprehensive error handling

## HTTP Methods:
- Handle appropriate HTTP methods (GET, POST, PUT, DELETE)
- Proper status codes (200, 201, 400, 401, 403, 404, 500)
- Error responses with meaningful messages
- Success responses with consistent data structure

Please provide the complete API route with proper TypeScript types and comprehensive error handling.`,

  hook: (name) => `# Create Custom Hook: ${name}

Create a custom React hook called \`${name}\` for the Exit School Off-Market Tool.

## Requirements:
- TypeScript with proper generic types
- Integration with TanStack Query for data fetching
- Supabase client integration
- Proper error handling and loading states
- Optimistic updates where appropriate
- Cache management and invalidation
- Type-safe return values and parameters

## Hook Structure:
1. Import statements with proper types
2. Hook parameters interface
3. TanStack Query integration
4. Supabase operations
5. Error handling and loading states
6. Return type with proper typing
7. Usage examples in comments

Please provide the complete custom hook with proper TypeScript typing and comprehensive functionality.`
}

// Utility functions
function copyToClipboard(text) {
  try {
    // Try different clipboard methods based on platform
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text })
    } else if (process.platform === 'win32') {
      execSync('clip', { input: text, shell: true })
    } else {
      execSync('xclip -selection clipboard', { input: text })
    }
    return true
  } catch (error) {
    return false
  }
}

function savePromptToFile(prompt, type, name) {
  const promptsDir = path.join(process.cwd(), 'prompts', 'generated')
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${type}-${name}-${timestamp}.md`
  const filepath = path.join(promptsDir, filename)
  
  fs.writeFileSync(filepath, prompt)
  return filepath
}

function displayUsage() {
  console.log(`
🤖 Claude Generation Script

Usage: npm run claude:<type> <name> [testType]

Available types:
  component   - Generate React component prompt
  migration   - Generate SQL migration prompt  
  test        - Generate test suite prompt (supports multiple types)
  api         - Generate API route prompt
  hook        - Generate custom hook prompt

Test types (for npm run claude:test):
  unit         - Unit tests with Jest and React Testing Library (default)
  integration  - Integration tests with real API/DB interactions
  e2e          - End-to-end tests with Playwright
  performance  - Performance tests with Lighthouse CI

Examples:
  npm run claude:component UserProfile
  npm run claude:migration add_campaigns_table
  npm run claude:test components/UserProfile unit
  npm run claude:test onboarding-flow e2e
  npm run claude:test dashboard-page performance
  npm run claude:test auth-flow integration
  npm run claude:api users/profile
  npm run claude:hook useUserData

The generated prompt will be:
1. Copied to your clipboard (if supported)
2. Saved to prompts/generated/ directory
3. Displayed in the terminal

Then paste the prompt into Claude and save the generated code!
`)
}

// Main function
function main() {
  const [,, type, name, testType] = process.argv
  
  if (!type || !name) {
    displayUsage()
    process.exit(1)
  }
  
  if (!CLAUDE_PROMPTS[type]) {
    console.error(`❌ Error: Unknown type '${type}'`)
    console.log(`Available types: ${Object.keys(CLAUDE_PROMPTS).join(', ')}`)
    process.exit(1)
  }
  
  console.log(`🚀 Generating Claude prompt for ${type}: ${name}`)
  if (type === 'test' && testType) {
    console.log(`📋 Test type: ${testType}`)
  }
  console.log('─'.repeat(50))
  
  // Generate the prompt
  const prompt = type === 'test' 
    ? CLAUDE_PROMPTS[type](name, testType)
    : CLAUDE_PROMPTS[type](name)
  
  // Try to copy to clipboard
  const copiedToClipboard = copyToClipboard(prompt)
  if (copiedToClipboard) {
    console.log('📋 Prompt copied to clipboard!')
  } else {
    console.log('⚠️  Could not copy to clipboard (platform not supported)')
  }
  
  // Save to file
  const filename = type === 'test' && testType 
    ? `${type}-${testType}-${name}`
    : `${type}-${name}`
  const filepath = savePromptToFile(prompt, filename, name)
  console.log(`💾 Prompt saved to: ${path.relative(process.cwd(), filepath)}`)
  
  console.log('─'.repeat(50))
  console.log('📝 Generated Prompt:')
  console.log('─'.repeat(50))
  console.log(prompt)
  console.log('─'.repeat(50))
  console.log('')
  console.log('✨ Next steps:')
  console.log('1. Paste this prompt into Claude')
  if (type === 'test') {
    console.log('2. Paste your implementation code in the [PASTE YOUR CODE HERE] section')
    console.log('3. Review the generated test code')
    console.log('4. Save the test file to your __tests__/ directory')
    console.log('5. Run tests with: npm run test')
  } else {
    console.log('2. Review the generated code')
    console.log('3. Save the code to your project')
    console.log('4. Test and iterate as needed')
  }
  console.log('')
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Run the script
main()