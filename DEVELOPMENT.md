# Exit School Off-Market Tool - Development Guide

A comprehensive guide for developing, testing, and deploying the Exit School Off-Market Tool.

## 🚀 Quick Start

```bash
# Initial setup
npm run setup
npm install
cp .env.local.example .env.local

# Configure your environment variables in .env.local
# Start development
npm run dev
```

## 📋 Table of Contents

1. [Development Environment](#development-environment)
2. [Available Scripts](#available-scripts)
3. [Database Management](#database-management)
4. [Testing](#testing)
5. [Claude Integration](#claude-integration)
6. [Email Development](#email-development)
7. [Deployment](#deployment)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

## 🛠️ Development Environment

### Prerequisites

- **Node.js** 18+ (with npm)
- **Git** for version control
- **Supabase CLI** (optional but recommended)
- **Vercel CLI** for deployment

### Project Structure

```
exit-school-off-market-tool/
├── app/                    # Next.js 14 App Router
│   ├── (admin)/           # Admin-only routes
│   ├── (public)/          # Public routes
│   ├── (user)/            # Authenticated user routes
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and configurations
├── hooks/                 # Custom React hooks
├── emails/                # React Email templates
├── supabase/              # Database migrations and types
├── scripts/               # Development automation scripts
├── __tests__/             # Test files and utilities
└── prompts/               # Generated Claude prompts
```

### Environment Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd exit-school-off-market-tool
   npm run setup
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual API keys
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## 📜 Available Scripts

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Testing Scripts
- `npm run test` - Run test suite once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests with coverage for CI
- `npm run test:coverage` - Generate coverage report
- `npm run test:debug` - Debug tests with Node inspector
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:setup` - Configure testing environment

### Database Scripts
- `npm run db:generate` - Generate TypeScript types from schema
- `npm run db:reset` - Reset local database
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:backup` - Create database backup
- `npm run db:migrate` - Create new migration

### Claude Integration Scripts
- `npm run claude:component <name>` - Generate component prompt
- `npm run claude:migration <name>` - Generate migration prompt
- `npm run claude:test <name>` - Generate test prompt
- `npm run claude:api <name>` - Generate API route prompt
- `npm run claude:hook <name>` - Generate custom hook prompt

### Email Development Scripts
- `npm run email:dev` - Start email development server
- `npm run email:export` - Export email templates

### Deployment Scripts
- `npm run deploy` - Show deployment help
- `npm run deploy:preview` - Deploy to preview environment
- `npm run deploy:prod` - Deploy to production
- `npm run deploy:rollback` - Rollback to previous deployment
- `npm run deploy:status` - Check deployment status

### Monitoring Scripts
- `npm run health-check` - Run comprehensive health check
- `npm run health-check:monitor` - Continuous monitoring
- `npm run health-check:json` - JSON output for automation
- `npm run logs` - Follow Vercel logs
- `npm run analytics` - View analytics data

### Utility Scripts
- `npm run setup` - Initial project setup
- `npm run functions:deploy` - Deploy Supabase Edge Functions
- `npm run functions:serve` - Serve functions locally

## 🗄️ Database Management

### Initial Setup

1. **Generate types from schema:**
   ```bash
   npm run db:generate
   ```

2. **Seed with sample data:**
   ```bash
   npm run db:seed
   ```

### Working with Migrations

1. **Create new migration:**
   ```bash
   npm run db:migrate migration_name
   ```

2. **Apply migrations:**
   ```bash
   npm run db:push
   ```

### Backup and Restore

1. **Create backup:**
   ```bash
   npm run db:backup create
   ```

2. **List backups:**
   ```bash
   npm run db:backup list
   ```

3. **Restore from backup:**
   ```bash
   npm run db:backup restore backup-file.json
   ```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

- **Unit Tests:** `__tests__/components/`, `__tests__/hooks/`, `__tests__/lib/`
- **API Tests:** `__tests__/api/`
- **Integration Tests:** `__tests__/integration/`
- **E2E Tests:** `__tests__/e2e/`

### Writing Tests

Use the provided test utilities:

```typescript
import { render, screen, fireEvent } from '../utils/test-utils'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## 🤖 Claude Integration

### Generating Components

```bash
# Generate a component prompt
npm run claude:component UserProfile

# This will:
# 1. Generate a detailed prompt
# 2. Copy to clipboard (if supported)
# 3. Save to prompts/generated/
```

### Available Generators

- **Components:** `npm run claude:component ComponentName`
- **Migrations:** `npm run claude:migration feature_name`
- **Tests:** `npm run claude:test path/to/file`
- **API Routes:** `npm run claude:api endpoint/path`
- **Custom Hooks:** `npm run claude:hook useCustomHook`

### Using Generated Prompts

1. Run the generator script
2. Copy the generated prompt (auto-copied to clipboard)
3. Paste into Claude
4. Review and save the generated code
5. Test and iterate as needed

## 📧 Email Development

### Development Environment

```bash
# Start email preview server
npm run email:dev

# Visit http://localhost:3000 to preview emails
```

### Creating Email Templates

1. Create React Email component in `emails/`
2. Export template from `emails/index.ts`
3. Use in your application with the email service

### Email Testing

```bash
# Test email sending
npm run test __tests__/lib/email.test.ts
```

## 🚀 Deployment

### Preview Deployment

```bash
# Deploy to preview with full safety checks
npm run deploy:preview
```

This will:
- Run tests
- Build the project
- Deploy to Vercel preview
- Run health checks
- Log deployment details

### Production Deployment

```bash
# Deploy to production with enhanced safety
npm run deploy:prod
```

This will:
- Create database backup
- Run tests and build
- Deploy to preview first
- Ask for confirmation
- Run database migrations
- Deploy to production
- Run health checks

### Rollback

```bash
# Rollback to previous deployment
npm run deploy:rollback
```

### Deployment Status

```bash
# Check current deployment status
npm run deploy:status
```

## 📊 Monitoring & Health Checks

### Health Monitoring

```bash
# Single health check
npm run health-check

# Continuous monitoring
npm run health-check:monitor 60  # Check every 60 seconds

# JSON output for automation
npm run health-check:json
```

### What's Monitored

- **Application:** Main app response and API health
- **Database:** Connection and query performance
- **Edge Functions:** All deployed functions
- **Email Service:** Resend API connectivity
- **External APIs:** Google Places, OpenAI, etc.

### Logs and Analytics

```bash
# Follow live logs
npm run logs

# View analytics (if implemented)
npm run analytics
```

## 🔄 Development Workflow

### Feature Development

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Generate components with Claude:**
   ```bash
   npm run claude:component NewFeatureComponent
   # Paste prompt into Claude, implement component
   ```

3. **Run tests:**
   ```bash
   npm run test:watch
   ```

4. **Test in development:**
   ```bash
   npm run dev
   ```

5. **Deploy preview:**
   ```bash
   npm run deploy:preview
   ```

6. **Create pull request and merge**

7. **Deploy to production:**
   ```bash
   npm run deploy:prod
   ```

### Database Changes

1. **Create migration:**
   ```bash
   npm run db:migrate add_new_table
   ```

2. **Generate migration with Claude:**
   ```bash
   npm run claude:migration add_new_table
   # Implement SQL migration
   ```

3. **Test locally:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Deploy changes:**
   ```bash
   npm run deploy:prod  # Includes migration step
   ```

### Code Quality Workflow

1. **Pre-commit checks (automatic):**
   - ESLint
   - TypeScript checks
   - Tests

2. **Manual quality checks:**
   ```bash
   npm run lint
   npm run type-check
   npm run test:coverage
   ```

3. **Health checks after deployment:**
   ```bash
   npm run health-check
   ```

## 🔧 Troubleshooting

### Common Issues

#### Development Server Won't Start
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

#### Database Connection Issues
```bash
# Check environment variables
npm run health-check

# Reset database
npm run db:reset
npm run db:seed
```

#### Test Failures
```bash
# Clear Jest cache
npm run test -- --clearCache

# Run specific test
npm run test -- MyComponent.test.tsx
```

#### Build Failures
```bash
# Check TypeScript errors
npm run type-check

# Check for linting issues
npm run lint
```

#### Deployment Issues
```bash
# Check deployment status
npm run deploy:status

# Check application health
npm run health-check

# View logs
npm run logs
```

### Environment Issues

#### Missing Environment Variables
1. Check `.env.local` exists and has required variables
2. Run `npm run setup` to validate configuration
3. Check `scripts/setup.js` output for missing variables

#### Permission Issues (WSL/Windows)
```bash
# Fix git ownership issues
git config --global --add safe.directory $(pwd)

# Fix file permissions
chmod +x scripts/*.js
```

### Getting Help

1. **Check logs:**
   ```bash
   npm run logs
   npm run health-check
   ```

2. **Review generated documentation:**
   - Check `prompts/generated/` for Claude prompts
   - Review `logs/` directory for health check results
   - Check deployment logs in `logs/deployment-*.json`

3. **Run comprehensive health check:**
   ```bash
   npm run health-check:json > health-report.json
   ```

## 📝 Additional Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **TailwindCSS Documentation:** https://tailwindcss.com/docs
- **React Query Documentation:** https://tanstack.com/query/latest
- **React Email Documentation:** https://react.email/docs
- **Vercel Documentation:** https://vercel.com/docs

## 🤝 Contributing

1. Follow the development workflow above
2. Use Claude integration for consistent code generation
3. Ensure all tests pass before submitting PRs
4. Include health checks in your testing process
5. Document any new scripts or workflows in this guide

---

**Happy coding!** 🚀

For questions or issues, check the troubleshooting section or create an issue in the repository.